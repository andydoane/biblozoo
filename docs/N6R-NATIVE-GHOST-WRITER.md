# N6r — Ghost Writer Native iOS Audio: Final Playground Activity

> **Proposed PR, NOT owner-tested or merged.** Base `experiment/native-ios-audio` at `4ccd11905dcabd11ca5f2eca7597782b9bb4a595`. [N6q Verse Jam PR #58](https://github.com/andydoane/biblozoo/pull/58) **MERGED** November 9, 2026 at 16:29:48 UTC, but the owner has **not yet run physical iPhone tests**. The accepted baseline therefore remains **12/12 external games and Playground 3/5** (Verse Typer, Scripture Scrub, Wheel of Bible). This N6r Ghost Writer proposal is the **fifth Playground code migration**, not a fifth iPhone-accepted game. Only owner-reported device tests may raise the accepted count.

## The actual sound inventory and scope

Ghost Writer is the handwriting game: it trains the player's finger-drawn letters, then plays back the complete verse/reference with their own glyphs, tools, vapor trails, optional spooky soundtrack, Remix/Save Image/Save Video, and the original completion callback. **It does not play spoken Bible narration or record from the microphone.** Its `MediaRecorder` path records a **canvas video stream** via `captureStream`; the punctuation “recorder” is a **disabled developer drawing tool** (`ENABLE_PUNCTUATION_RECORDER = false`). Both remain unchanged. N7 microphone capture/recording is separate.

The current shipping `game.js` actually uses **five** original sampled `ghost_writer_spooky_1.mp3` through `ghost_writer_spooky_5.mp3`, plus two shared menu pop MP3s. It shuffles those five into no-immediate-repeat bags, plays one full sampled clip at a time, waits a randomized **900–1150ms** gap, then plays the next while optional “Spooky Sounds” is On. It preserves original master 0.82, spooky 0.34 and UI tap 0.42 balances. **Six additional `ghost_writer_scribble_1…6.mp3` files exist but are not used by this game**; deliberately do not add their sounds to the native gameplay or alter handwriting timing.

N6r routes these **7 fixed native IDs** through the existing single serialized `.soloAmbient` Swift `AVAudioEngine`: `ghost-spooky-1…5` plus shared `ui-pop-1` and `ui-pop-2`. Swift loads the exact local bundled MP3s into predecoded `AVAudioPCMBuffer` voices **only after an explicit user-gesture preflight**. JS never gives Swift arbitrary local URLs, sound names or paths. The per-clip `durationMs` returned after a native scheduled play determines the next ambient clip's delay (and is **not acoustic proof**). Stopping a current spooky clip invokes a **targeted native group stop** so the rest of the PCM bank remains warmed; app interruption/exit invalidates all effects. Web/PWA/Android retain the original Web Audio/HTML paths; experimental iOS never silently falls back to Web sound.

## Safety and continuation rules

- Actual **Beginner/Advanced mode tap**, first **Ghost Write!**, **Replay**, **Game Menu Close/unmute**, failure **Try Again** and plain **Welcome Back → Let's go** are allowed native activation gestures. Title/Help/Back UI taps can prepare only the two UI clips. A preflight progress dialog blocks training/replay until all seven predecodes are ready. **No passive foreground, rAF, canvas stroke, timed clip transition or app visibility event may activate a native audio session.**
- Opening Game Menu, muting, leaving Remix, pressing Back, taking the app to background, or held UIKit App Switcher while WebKit seems visible must stop/cancel the spooky clip sequence. Keep the original individual glyph strokes, character index, verse, color/remix choices, playback `index`, `charStart`, `pauseUntil`, practice completion and reward flags. Never restart whole handwriting/reward flow just because the sound was interrupted.
- After app return, **plain Welcome Back** (no unrelated Zoo Break during a competing YouTube/call audio interruption) must require a real gesture and successful bank preflight. Playback resumes from its frozen drawn character, shifting the animation timestamps past time spent away, and restarts a fresh no-immediate-repeat spooky clip queue if enabled. The optional “Spooky Sounds Off” and mute choices remain silent and must not require stealing audio priority.
- A genuine unavailable bridge/PCM decode raises an accessible **Try Again / Back to Playground** dialog. Transient `activation-os-rejected` and other higher-priority sound/PiP conflicts remain in plain retriable Welcome Back; no automatic retry/claimed audibility.
- No microphone permission, recorder category change, new background-audio entitlement, Zoo changes, extra pet/verse telemetry, tracking of audio content, or saved player-progress rewrites.

## Your familiar merge-first workflow

1. Check the PR **final HEAD** GitHub Actions shows **both GREEN**: Node regression checks (including `scripts/validate_native_playground_ghost_writer_n6r.js`) **and Production web build**. This does not compile AVFoundation Swift or prove a human heard output.
2. **Merge personally** into `experiment/native-ios-audio`, not `ios-prep` or `main`.
3. In GitHub Desktop select the dedicated `biblozoo-native-audio` checkout, branch `experiment/native-ios-audio`, and **Pull origin**.
4. In that VS Code folder run your standard command:

   ```bash
   npm run build && npx cap sync ios && npx cap open ios
   ```

5. Select **App** scheme and the **physical iPhone** in Xcode and press **Play**. The separate `com.andydoane.biblozoo.audiotest` application must be selected, not your installed original BibloZoo app.
6. If anything misbehaves, share the specific step and Xcode compile error, or use DEV **Inspect native state / Copy Audio Timing Report** for unexpected silence. We can fix it in a focused follow-up before counting an accepted game.

## Physical iPhone testing — what to hear and observe

1. **Cold launch:** Home → Verse Playground → Ghost Writer. Title Start/How to Play/Back UI pops may omit a delayed *first cold tap*, but never play late over the next screen. Choose **Beginner** on a real tap; observe native preflight then drawing lesson, not an empty/gray popup or skipped level. Repeat with **Advanced**.
2. **Training and preservation:** Draw a few glyphs with your finger, use Clear/Undo/Next, tutorial guide and Game Menu/Help. Make sure no silent preflight starts during finger drawing, no lost strokes, and no unexpected menu sounds after exit.
3. **First Ghost Write!:** Complete training, tap **Ghost Write!**. Ghost should write the verse/reference in your actual trained handwriting and show its existing tool/vapor effects at the original speed. With Spooky Sounds **On**, genuinely hear all **five distinct original spooky clips** across repeats, randomized with ~0.9–1.15-second quiet gaps; no overlap, missing audio or immediate repeat. Do not confuse missing scribble scratching sounds with a bug: those six MP3s were never used by the shipping game.
4. **Remix/Replay:** Change background, ink, tool, speed, video/image options; set Spooky Sounds **Off** and replay silently, then **On** and replay with audio. Mute/unmute via menu. Remix after playback must not reset your trained handwriting. Test image save and (where supported) **canvas video export**; no microphone consent prompt is expected.
5. **Interrupt mid-word:** During replay, use held UIKit App Switcher (swipe up **and hold** while WebKit thumbnail is visible), then return. The handwriting should stop at the *same glyph* with no accelerated catch-up, reward duplication or phantom sound. Tap **Welcome Back → Let's go** and hear a fresh spooky clip queue before the animation continues.
6. **YouTube Picture-in-Picture:** Repeat with PiP **PAUSED**, then **STILL PLAYING**. A higher-priority audio refusal should lead to plain retriable Welcome Back, not Zoo BREAK or premature completion. Also test full app switch, Home, lock and rapid back/forward and menu exits.
7. **Completion:** On the first genuine end of handwriting playback, verify completion/progress fires **once**, not on app resume, retry, or clip end. Replay again, then return to Playground; verify already-accepted Verse Typer/Scripture Scrub/Wheel, Home/Feeding/Learn. Separately test [merged but unaccepted Verse Jam #58](https://github.com/andydoane/biblozoo/pull/58) when available.

## Signoff and handoff

The **final Playground code slice** is proposed here, but the project is **not** “all Playground tested” until you personally validate **Verse Jam #58 and this Ghost Writer PR** on a real iPhone. At present **3/5 owner accepted**, **4/5 merged** (Verse Jam pending tests), and **N6r PR open for the last code migration**. After both PASS, Playground can become 5/5. Later N7 microphone/recording/DSP, N8 standalone Zoo Escape surprises, N9 full app stress/release integration remain independent and must still be verified. Every PR updates `PROJECT-HANDOFF.md`, `TESTING.md`, `AUDIO-RECOVERY.md` and its own acceptance guide.
