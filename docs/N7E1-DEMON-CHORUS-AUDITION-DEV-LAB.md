# N7e.1 — Five Demon + five Chorus Alien auditions (DEV-only)

**Status:** new isolated native iOS PR; owner **physical iPhone test PENDING**. Base is merged [N7e #71](https://github.com/andydoane/biblozoo/pull/71) at `8f3920b4b962969a1e6932f2944f407d4487fd75`. PR targets **only** `experiment/native-ios-audio`; run as separate `com.andydoane.biblozoo.audiotest`, never stable `ios-prep`, `main`, original app, Web/PWA/Android or children’s saved data.

## Why we are testing alternatives

Owner personally merged #71, built and physically listened to **all ten original native Wacky presets: all ten produced audible playback (owner PASS for that part)**. However **Demon sounds more like a corrupted MP3 than a demon** and **Chorus Alien has very little audible chorus**. These are sound-quality failures/unfinished acceptance for just those two, not evidence that the rest of N7e is broken. The user requested **five alternatives of each**, available directly from DEV Tools without random Flashcards choices. **This is a selection PR; it does NOT replace the two original child-facing Wacky effects until owner chooses a favorite.**

## Quick owner comparison — from one recording

1. Personally review and merge the PR only into the experimental `experiment/native-ios-audio` branch. In the separate Mac GitHub Desktop experimental worktree, **Pull origin** and run:
   ```bash
   npm run build
   npx cap sync ios
   npx cap open ios
   ```
   Build Xcode's **App** scheme to a **physical iPhone** and confirm `com.andydoane.biblozoo.audiotest`, not the original stable installed BibloZoo. A Linux Swift parser is **not** an Apple SDK compilation/physical hearing test.
2. On Home, the two old giant DEV overlays should **still be hidden**. Tap tiny **DEV Tools** (bottom-right). Existing **Wacky Lab · 10 Effects** remains available. **New, separate entry:** **Demon / Chorus Lab · 5 + 5**.
3. Open **Demon / Chorus Lab · 5 + 5**. Nothing records/plays automatically. Tap **Record a Phrase**, allow native mic if asked, wait for visible **3…2…1**, speak one recognizably varied **3–6 second** sentence, then **Stop Recording**. One temporary Swift RAM-only voice take is now reusable for the entire comparison.
4. Play **Current Demon** as the unchanged baseline. Then tap D1 through D5 in any order, replay whichever you want as often as needed. Switch directly to **Current Chorus Alien**, then tap C1 through C5 using **the same original take**. This eliminates both random-choice luck and having to re-record between effects. **Original Voice** is also available for a clean reference.
5. **Stop Playback** should silence *all* layered chorus voices immediately without marking an unheard take complete. **Close ×** discards the take. Reopen the Lab: no previous voice ready. App-switch/lock or real AirPods Play interruptions must not auto-restart recording/effects.

## The ten DEV-only candidates

| Button | Technique | Listening target |
| --- | --- | --- |
| **D1 · Clean Depth** | −6 semitones, 0.94×, light room/lowpass; no distortion | Understandable, gently demonic bass |
| **D2 · Dark Shadow** | −8, 0.92×, stronger shadow/reverb; no distortion | Dark and resonant, not digitally broken |
| **D3 · Deep Abyss** | −10, 0.90×, heavy lowpass, moderate reverb; no distortion | Very low, cavernous bass with intelligible words |
| **D4 · Haunted Whisper** | −4, 0.97×, gentler filtering + subtle 120ms echo; no distortion | More spooky/ghostly than crushed |
| **D5 · Soft Thunder** | −7, 0.91×, only **3%** drive + 170ms echo | Rumbly/forceful but not the old corrupt-MP3 artifact |
| **C1 · Airy Trio** | Main +2 semitones, two ±10-cent voices at 15/29ms | Clearly three lightly spread voices |
| **C2 · Alien Swarm** | Main +3, ±23 cents at 12/35ms, stronger layers | A noticeably fuller, denser sci-fi chorus |
| **C3 · Cosmic Voices** | Main +5, ±42 cents at 23/47ms, slight room tail | More obvious otherworldly multi-voice shimmer |
| **C4 · Wide Choir** | Natural main pitch, ±14 cents at 26/52ms, even balance | Wider musical ensemble, less artificial pitch |
| **C5 · Wobbling Chorus** | Main +3, ±27 cents at 17/43ms plus ±75-cent pitch wobble | Audible moving/shimmering chorus, not a simple echo |

These variants process the **same recorded mono PCM in native Swift**, never a synthetic example. C1–C5 actually mix **three individually pitch-shifted voices** with short independent delays, unlike the original single static 14ms delay. Each mix has bounded gain. D1–D4 eliminate distortion entirely; D5 uses only a very light amount. Reverb and 0–2s zero-padded tails are bounded inside the existing native `12_500_000` frame cap.

**Please report:** the D number that feels most like a demon **without corrupted-file artifacts**, and the C number with the strongest **pleasant and clearly audible chorus**. If none is good, describe what is missing (too robotic, too slow, harsh, not enough layers, echo instead of chorus, etc.). Selecting a favorite does **not** automatically change child-facing Wacky; a later small PR can promote the chosen sound after explicit owner approval.

## Existing safety/child behavior must remain unchanged

- Original **Demon** and **Chorus Alien** remain in the child Wacky randomized set *unchanged* in this PR, along with the other eight. No DEV variant IDs in child menus, rewards or `flashcards/flashcards.js`; original Web `audio-effects.js` and recording sources remain unmodified.
- Standard child Wacky one-use still requires real **nonzero post-DSP mixer output** before consuming the opportunity and real matching `AVAudioPlayerNode.dataPlayedBack` before a successful full effect; normal dry voice still solely controls Next/grade. Never claim speaker audibility from a Swift event alone.
- DEV variants require **both** the exact native Audio Test bundle and a **`devVariant:true`** Capacitor argument originating in the separate DEV comparison method `playDevVariant`. Ordinary `playFun` refuses the ten DEV variant IDs. No WebAudio/HTML fallback, raw PCM bridge payload, saved file, upload, microphone loop, child profile backup or mutation.
- The N7d.2 foreground audio priority takeover/retention stays intact; Apple Music should stay paused after a deliberate BibloZoo effect, while an **external AirPods Play** can interrupt actual playback without app auto-restart. Normal speaker and AirPods routes, held App Switcher and lock remain safety checks. The two DEV diagnostic panels remain hidden until manually reopened.
- Closing the Lab stops all extra `AVAudioPlayerNode` layers/engine effects and discards the single RAM take. Fresh owner gestures only; no auto permission prompt, mic capture or playback when opening the dock/lab.

## Automated gates vs hardware evidence

`node scripts/validate_native_n7e1_demon_chorus_variant_lab.js` verifies all five D and five C IDs, DEV-only flag and original child whitelist isolation, original Wacky Lab and DEV overlays preserved, one temporary RAM take replayed ten times through actual native JS facade, true started/ended event tokens, Stop/stale/OS refusal/Exit, extra voice source and cleanup, no Web fallback. Existing N7e ten-original suite, N7d.2 priority and older N1–N6 suites, Swift grammar parse of **both** full iOS Swift plugin source files, Production Web build must remain green. **Node/Swift grammar on Linux cannot typecheck AVFAudio Apple SDK APIs, generate audible proof, or confirm AirPods behavior.**

Record the merged commit SHA, individual D/C impressions and any Xcode errors in the next PR handoff. **N7e.1 remains owner hearing PENDING until physical testing.** Next roadmap is N7f Read My Verse OUTPUT-only and N7g full integrated recovery/privacy/Bluetooth, once sound-quality decisions settle.

[Living handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md) · [Original N7e guide](N7E-NATIVE-WACKY-REPLAY-DEV-LAB.md).
