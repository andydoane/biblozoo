# N3a — Predecoded Native PCM Star/Chomp Effects

> Isolated iOS `BibloZoo Audio Test` only; experimental [PR #24](https://github.com/andydoane/biblozoo/pull/24) targets `experiment/native-ios-audio`. Not a new engine for the web, PWA, Android or stable `ios-prep`. The original BibloZoo installation, sessions, pet profiles, recording data and rewards must remain intact.

## Why this slice

**Actual owner iPhone evidence, Nov 7, 2026, after merged N2.2 [PR #23](https://github.com/andydoane/biblozoo/pull/23):** The owner pasted **two separate report datasets** from Classic Feeding. Report 1 with no task switching contained **14** sounds and **6** dispatches >=120 ms. Report 2 with task switching contained **13** sounds and **7** dispatches >=120 ms (foreground epoch 1, interruption pending false at report-copy time). Across **27** events, **13** delays were >=120 ms. **12 of the delayed rows** spent **392–744 ms inside `AVAudioPlayer.play()`**, while the thirteenth event waited **457 ms in the native serial queue**, immediately after a star play call took 459 ms. Non-delayed play calls were approximately 18–46 ms. JavaScript physics→request and JS→native bridge were generally 0–3 ms. In both cases the user said sounds were heard but some chomps felt late, and gameplay was **smooth with no visible freeze** after N2.1. This diagnoses a long native method execution, **not** the acoustic onset instant. No causal proof for what AVAudioPlayer was doing internally or why. Task switching is not needed to produce delayed rows. **The owner did not explicitly confirm successful task-switch → Resume**; second report's foreground epoch merely shows the app returned.

## N3a design and safety

- **Swift remains the single output owner**: `ios/App/App/BibloZooNativeSoundPlugin.swift` retains existing `activateFromGesture({purpose:"feeding"|"dev"})`, .soloAmbient category check, real interruption latch, 4s bounded retry, foreground/route/media reset cleanup, unchanged three allowlisted IDs and fixed bundled MP3 paths. No hidden Web/HTML fallback, category/mode override, automatic session activation, mic change, background entitlement or autoplay.
- **Preflight on the human's Got It!/Resume tap**: existing `BibloZooFeedingNativeAudioPilot.prepare` invokes native `activateFromGesture` then preloads `feed-star` and `feed-chomp`. The native worker opens those bundled MP3s via `AVAudioFile`, decodes them once into bounded `AVAudioPCMBuffer`s (max 1.5 million frames each), connects a dedicated `AVAudioPlayerNode` per sound to a single `AVAudioEngine` mixer, starts that engine and prestarts each player node **without scheduling any audible sound**. This can take time on the **preflight** (before gameplay), not on collision.
- **Collision hot path**: JavaScript `catchBall` and star-peg collision callbacks remain unchanged; one existing Capacitor `play({soundId,volume,eventId,...timestamps})` reaches the same Swift worker as before. For star/chomp, the worker adjusts the node's volume and invokes `scheduleBuffer(buffer, at:nil, options:[.interrupts])` using **already-decoded memory**. No `AVAudioFile` open, `AVAudioPCMBuffer` allocation, `AVAudioEngine.start`, `AVAudioPlayerNode.play` or `AVAudioPlayer.play` occurs in that effect's hot path. This is still a single node per sound (rapid repeated same-ID clips interrupt prior same-ID clips), not full polyphony; N3 later can add a bounded voice pool.
- **Reference/native DEV pet unlock**: `pilot-unlock` intentionally stays on its original **native** `AVAudioPlayer` path as an A/B comparison. DEV star/chomp also exercise the PCM path. No switch to Web audio even if PCM engine start/decoding fails: return a specific `pcm-decode-or-engine-start-failed` / `pcm-not-preloaded`/size error and keep the existing visible Native-only refusal/Back path.
- **Stopping and lifecycle**: on background, interruption, route changes or media reset, increment the existing cancellation epoch on main, queue a worker teardown of all nodes/PCM buffers/engine plus pilot player. A user must explicitly tap Got It!/Resume again to build a fresh graph; no stale queued effects or automatic resume. `stop(soundId)` on an effect tears down the effect graph; the next preflight repopulates both samples.
- **Timing preserved, clarified**: `Copy Audio Timing Report` still holds last **80** events in memory, without disk/network, child/pet/verse/recording data. Each row now has a backend label: `avengine-pcm` or `avfoundation-player`. The `worker call` duration for PCM measures **buffer scheduling**, not actual acoustic output, while pilot still measures `AVAudioPlayer.play()`. The report's `collision->native dispatch` is a software timeline endpoint, not speaker onset. Existing optional late-chomp marker and native clipboard copy remain. `DEV Inspect` includes `backend=...`. Capture rows for comparison; **do not claim latency resolved without human hearing**.

## Physical iPhone acceptance after owner review and merge

In the **dedicated `biblozoo-native-audio` worktree**, Fetch/Pull `experiment/native-ios-audio` and run:

```sh
node scripts/validate_native_audio_test_identity.js
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_audio_timing_n22.js
node scripts/validate_native_pcm_effects_n3a.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Run **BibloZoo Audio Test** (bundle `com.andydoane.biblozoo.audiotest`) on a real iPhone. **Swift compilation and speaker tests do not run in GitHub's Linux Node CI.**

1. **Build first:** Confirm Xcode compiles the Swift `AVAudioEngine/AVAudioPCMBuffer/AVAudioPlayerNode` API and the app launches with `.audiotest` identity. If not, capture *the first actual Xcode compiler error*; do not guess success from CI.
2. **DEV audio:** Press DEV **Play star**, **Play chomp**, and **Play native test sound** (pet unlock) and listen to each. For the new effects the `backend` should read `avengine-pcm`, and pet unlock should remain `avfoundation-player`. A `prepared` or `scheduled` bridge result is **not proof of audibility**. Never silently play the old HTML/Web path.
3. **Native Classic Feeding:** Daily To-Do Preview → Feeding Game Tester → Classic → Got It!. Try several star/chomp events, including quick repeats. **Listen for all effects**, whether chomp sounds close to the pet/snack collision, whether ball animation remains smooth, and whether any chomp is missing/cut off. Peg beep tones remain silent intentionally; native peg tones are later N3, not in this PR.
4. **One-tap report:** After playing, tap DEV **Copy Audio Timing Report**, paste into the next chat. Compare `avengine-pcm` rows to prior 400–750 ms player-call stalls and note **human-perceived** timing as well. A small `worker call` merely proves scheduling is fast; if ear-heard sounds remain late, the remaining cause may be native output/render scheduling rather than bridge.
5. **Return/recording/rewards:** Task-switch mid-Classic, return and press **Welcome Back / Resume**, check same round/score, no duplicate points, no auto-play or Zombie audio, and Back works. This acceptance was not specifically reported after N2.1; capture exact failure if any. Check silent switch/headphones if convenient and no unexpected recording prompt/data loss. DEV close/exit should stop the engine. Web/PWA/Android and original BibloZoo still behave as before.

**Gate:** N3a is passed only after Xcode compilation, real star/chomp audibility with tolerably consistent onset, smooth gameplay, and explicit functional Resume. If PCM engine startup/preflight fails, preserve error and make focused follow-up rather than re-enable Web output. Then continue N3 voice pools + native collision peg tones, N4 wider Feeding modes. Zoo Escape/ZOO BREAK independent random fun remains N8.
