# N6p — Wheel of Bible: Third Verse Playground Native Audio PR #57

> **OWNER-ACCEPTED (2026-11-09):** [PR #57](https://github.com/andydoane/biblozoo/pull/57) is **MERGED** into isolated `experiment/native-ios-audio` at `46971fb8ec7456fa66892d059dea38054b8c976f` (2026-11-09 15:15:14 UTC); owner reports the full routine Wheel of Bible audio/gameplay and interruption physical-iPhone tests **PASS**. **Playground 3/5 accepted**, **12/12 standalone external games** owner-accepted; Verse Jam and Ghost Writer remain. The PR test checklist below is retained as its historical acceptance guide. No event-by-event acoustic measurements were supplied. Stable `ios-prep`, separately installed original BibloZoo, Web/PWA/Android, mic, Zoo, rewards, saved player progress remain protected. [Proposed N6q Verse Jam guide](N6Q-NATIVE-VERSE-JAM.md).

## Why Wheel of Bible next

Wheel has a shared shell, a bounded finite set of original sound recipes and an existing pause-aware `BibloZooWelcomeBackClock`, but has an important special case: it **speaks the entire verse followed by the Bible reference** before its spins. Replacing the wheel ticks while leaving that speech on HTML `audio` would make the native-only iPhone appear broken. This PR migrates **both musical effects and spoken intro**. The final two Playground apps afterward are **Verse Jam** (beat/audio clock-intensive) and **Ghost Writer** (includes microphone-adjacent paths). No mic/recording or N7 work in this PR.

## Exactly what sound is preserved

The original `verse_playground/wheel_of_bible/game.js` generates 36 **distinct MIDI/duration/original gain/waveform configurations**. They are mapped to fixed IDs `wheel-note-<midi>-<durationMs>-<volumeMilli>-<wave>` (wave `q` square, `s` sine, `t` triangle). Every ID is statically defined in both JS allowlist and Swift recipe bank; JavaScript may only select an existing fixed ID. Swift renders all 36 in the **same serialized single `.soloAmbient` `AVAudioEngine`** during a child's real Start/Resume tap. The two existing native UI pops are also prewarmed = **38 unique short PCM IDs**. No Web Audio/HTML speaker output/fallback on native iOS, no hot oscillator/decode and no second AVAudioSession.

| Sound family | Original source notes and shapes |
| --- | --- |
| Wheel spin 22 ticks at **95ms spacing** | Three repeating square beeps, MIDI **50/53/56**, 45ms each, volume 0.12; the existing real `spinStartedAt` and pause-aware wheel timer preserve which ticks are already due |
| Intro “Wheel of Bible!” | Three triangle beeps MIDI **67/71/75**, 100ms, gain 0.24 |
| Correct cash/good | Two original triangle MIDI **72** (100ms, .28), **79** (140ms, .22) at original stagger |
| Keyword letter challenge | Eight possible MIDI **60,62,64,65,67,69,71,72**, each 130ms triangle, 0.48. Existing randomly chosen `keywordMelodyPoolsForLength(1..10)` still selects the correct note; never generic success beep |
| Wrong response | MIDI **43** then **38**, 130/120ms sine, original .32/.24 gain |
| Letter/challenge pops | Five triangle MIDI **64/66/68/70/72**, 80ms, .18 |
| Prize fanfare | MIDI **72/76/84** at source 0,70,145ms offsets, volume .25/.24/.28 and durations 100/100/180ms |
| Hint fanfare | MIDI **67/72/76**, original 0/70/145ms and 80/90/120ms, gains .18/.18/.16 |
| Finale fireworks | Seven randomized MIDI **72 through 78**, 35ms triangle, .07; same random visual sparkle choices |
| Shared UI | `ui-pop-1`, `ui-pop-2` native sounds, used by Start and Game Menu |
| **Spoken verse and reference** | Existing **N5b long-form AVAudioPlayer** for `learn-verse-<publishedVerseId>` then `learn-ref-<publishedVerseId>`, validated against bundled published verse manifests/audio. `biblozooNarration` matching `requestId` **ended** required; not included in short PCM ID count |

Original source Web `playTone` envelopes ramp from `0.0001` to source peak over 12ms, then down to `0.0001` before note end; original global `WEB_AUDIO_MASTER_VOLUME=0.82` is baked in the native PCM, with original sine/square/triangle timbres. Source sequencing uses the **same** `gameTimeout` and `welcomeClock` as before—no replaying overdue ticks from an interruption. Device ears must check balance, timbre and uninterrupted spin perception; Linux CI doesn't prove acoustic output.

## Spoken opening, interruption and race prevention

- Original **Start** first performs full **38-ID** native short PCM bank preflight from the child's actual tap. Wheel intro music/animation starts only after success. The **Meet Verse** button begins the native full-verse narration and then the separate native reference. Published verse ID must be allowlisted in the existing local N5b manifest; no caller-provided file URL. The reference/finale prompt appears **only after matching AVAudioPlayerDelegate ended notifications** for both clips, not `accepted:true`, not a Web clock or timeout.
- The actual verse or reference may be interrupted mid-clip by a held App Switcher, phone lock, external audio or YouTube PiP. The shared native narrator tracks approximate current `positionMs` during playback; on the next **genuine Menu Close/Welcome Back Let's go** with a fresh 38-ID preflight it resumes the **same** verse/reference near the previous position. A stalled/unavailable published recording raises accessible Try Again/Back; it never quietly treats silence as an audible completion.
- **Only genuine child gestures** (Start, Menu Close, sound-failure Try Again, plain Welcome Back Let's go) may invoke Swift `activateFromGesture`. Neither app load, passive foreground, OS interruption end, timer, wheel spin tick, hot PCM play nor automatic narration retry can own the session. Still-playing YouTube PiP can legitimately return `activation-os-rejected`; this stays retriable **plain Welcome Back**, not a gray corruption dialog, silent gameplay or unexpected Zoo BREAK.
- A mid-spin or mid-60-second final round **Game Menu**, Help, held UIKit App Switcher or PiP freezes the same selected wheel sector, 22 tick index, remaining spin animation, Bible Bux, prize bag, clue challenges/keyword melody, visible verse letters, 60-second virtual clock, completion/medals. Menu Close does not unfreeze until short PCM is genuinely ready. After task return `welcomeClock`, frozen JS timers and paused CSS animations resume from the same moment. No automatic cash/prize rewards on background.
- Only the single existing `.soloAmbient` AVAudioSession and serial native AVAudioEngine; no replacement Web `AudioContext` on iOS. Browser/PWA/Android still run the original Web/HTML output paths and animations.

## Your familiar owner testing routine

**No unusual terminal commands required.** First check the PR's **final HEAD** shows two green GitHub Actions jobs (Node regressions and Production web build). This is the same isolated experiment, so your usual *merge first, test physically second* routine is appropriate.

1. **You merge [PR #57](https://github.com/andydoane/biblozoo/pull/57)** personally into `experiment/native-ios-audio`, never stable `ios-prep`.
2. In GitHub Desktop select **`experiment/native-ios-audio`** inside your separate **`biblozoo-native-audio`** checkout, then click **Pull origin**.
3. In that VS Code folder, paste your familiar one-liner:

   ```bash
   npm run build && npx cap sync ios && npx cap open ios
   ```

4. Select physical iPhone, **App** scheme and the separate `com.andydoane.biblozoo.audiotest` test bundle in Xcode. Press **Play**.
5. Test sound/game flow and tell me **PASS or unexpected behavior**. If a problem appears after merging this isolated test branch, we'll make a focused correction.

Optional **only on trouble**, not normal workflow: `node scripts/validate_native_playground_wheel_n6p.js`, `node scripts/validate_native_playground_scripture_scrub_n6o.js`, `node scripts/validate_native_pip_takeover_n6h2.js`, `node scripts/validate_native_only_ios_output.js`. GitHub CI already runs those checks.

## What to test on the actual iPhone

1. **Title/intro:** Home → Playground → Wheel of Bible. Tap Start. Hear three distinct intro beeps and prize fanfare, watch original intro and Meet Verse button. No routine gray error, no premature spin before full audio preflight.
2. **Really hear spoken verse + reference:** Tap Meet Verse on a published verse with both clips (e.g., John 3:16). Hear **the entire actual verse recording followed by the correct reference recording**, in order, before “Go spin the wheel” appears. Test a second published verse too. No silent timed skip, repeated wrong reference or HTML fallback.
3. **Wheel spin:** Hear the original ~22 rhythmic ticks, changing among three low square notes over 3.3-second spin; let cash and prize wedges land. The same wheel label/Bible Bux/prize must appear after the animation, with matching cash/prize fanfare. Try multiple spins and rewarded challenges.
4. **Keyword letter melody and hints:** Pick different length words, including 8–10 letters where possible; the correct letter should move through source-chosen pitches, wrong answers sound lower, hints play their three-note fanfare, letter pops vary. The original random prize bag/cash and selected verse remain unchanged.
5. **Final 60-second round:** Hear original finale fireworks while still tracking the same timer, money, streak, last verse letters and completion reward. End screen and Play Again must start new run sound safely.
6. **Game Menu/Help/mute:** Open during a spin (and separately during spoken verse and 60-second finale), visit How to Play, Back, close, intentional mute/unmute, rapid menu taps. It should freeze **exactly the current frame, tick, words, prizes and spoken clip** until fresh user Close; no late ghost notes or cash awards.
7. **Held App Switcher + YouTube PiP:** Mid-spin and mid-spoken verse, swipe up and **HOLD** the iPhone App Switcher while the WebView still looks visible. Return and tap plain Welcome Back **Let's go**. Repeat with YouTube PiP **PAUSED**, then **STILL PLAYING**, full app switch, screen lock and cold Home entry while PiP active. A genuine OS denial may require another tap, but no silent active wheel, stale narrated “ended”, or sudden 60-second timer jump.
8. **Regressions:** Return Home; sample both accepted Playground apps (Verse Typer's **spoken chunk review**, Scripture Scrub's varied **scrub progress melody and mower**), Verse Scramble, Traffic Tap, other accepted games, Feeding and Learn narration.
9. **If something is silent or Swift won't build:** Before restart DEV **Inspect native state**, **Copy Audio Timing Report** and save Xcode compiler output. Note current verse, verse/reference speech stage, wheel sector/tick, whether PiP still played, output route and iOS version. Native `prepared:true` / `accepted:true` proves buffers scheduled, not that human speakers heard them.

## Acceptance boundary and next apps

**12/12 external games complete**, **Playground 2/5 currently owner accepted**. This PR proposes **Playground 3/5**. Only the owner's actual iPhone **PASS after merge** changes the count to **3/5**, leaving **Verse Jam and Ghost Writer**. Subsequent N7 recording/Read My Verse audio, N8 fun Zoo events, N9 whole-app stress and stable integration are separate work. Every PR must update `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, `docs/AUDIO-RECOVERY.md` and a dedicated owner guide. CI cannot compile Swift on Mac or verify acoustic output.
