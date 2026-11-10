# N7e — Native Flashcards Wacky Replay and one-phrase ten-preset DEV Lab

**Status: isolated experimental native iOS implementation.** Owner's full Mac Xcode compile and physical iPhone hearing of all **ten** effects **PENDING**. This PR targets `experiment/native-ios-audio` only and the separate Audio Test bundle `com.andydoane.biblozoo.audiotest`; never `ios-prep`, main, original installed BibloZoo, browser/PWA/Android, Zoo or child data.

## Owner evidence and the original source contract

Owner personally merged [N7d.2 #70](https://github.com/andydoane/biblozoo/pull/70) at `0720ee6df8c44965eae1e20312500ef9be40a7bc` and reports **“That seemed to fix it.”** Record taking audio priority from Apple Music, retaining foreground priority after Stop and real dry voice replay over Apple Music are **provisionally owner PASS for the tested scope**; final cross-device/long-run assurance remains N7g. N7d Flashcards normal real mic, original live 16-bar meter, normal audible voice, real `.dataPlayedBack` completion and original 3→2→1 privacy boundary are preserved. N6 12/12 standalone games + 5/5 Playground owner PASS unchanged.

Original Web source `flashcards/audio-effects.js` defines these ten official Wacky presets, their order, pitch/tempo and character effect. **All ten** are implemented in Swift using actual recorded mono PCM kept in the N7c RAM take, native `AVAudioEngine` + `AVAudioPlayerNode` and `AVAudioUnitTimePitch` (pitch in semitone×100 cents; rate independent), with native additional effects. No WebAudio/HTMLMediaElement/SoundTouch fallback on isolated iOS.

| Preset | Source flavor | Native processing target / what to hear |
| --- | --- | --- |
| Squirrel | +9 semitones, 1.15× | High, slightly fast child voice |
| Giant | −7 semitones, 0.90× | Deep and slightly slow |
| Sleepy | −3 semitones, 0.55× | Much slower, slightly lower |
| Rocket | +4 semitones, 1.65× | Brighter and very fast |
| Roller Coaster | 0→+12→−12→+10→−10, 0.75s smooth sections | Wide rising/falling pitch while saying original words |
| Ascending | −10→+10 over take duration | Continuous low-to-high climb |
| Descending | +10→−10 over take duration | Continuous high-to-low fall |
| Demon | −8 semitones, 0.92×, lowpass/drive/reverb | Deep/dark driven voice and cavern tail |
| Chorus Alien | +3 semitones, 0.98×, ~14ms chorus delay | Multiple bright almost-simultaneous swirling voices |
| Cave | original pitch/speed, long hall reverb | Natural speaking voice with roomy reflections and trailing echo |

**Sound parity caveat:** The original browser renders through SoundTouch plus browser-specific DSP; native processing uses Apple's own DSP units. Numerical rates/target contour and broad character are matched, but effect algorithms (especially choir/chorus and reverb) will not be byte- or sound-identical. Physical owner listening is the acceptance gate; if one is unconvincing, please name that effect rather than approving all ten at once. Both source/browser and current audio effect references must remain unchanged.

## Fastest physical iPhone test: Wacky Lab (no normal Flashcards flow)

1. After merging N7e to the **experimental branch only**, open the Mac GitHub Desktop experimental worktree and **Pull origin**. From its repository root run:
   ```bash
   npm run build
   npx cap sync ios
   npx cap open ios
   ```
   Build/run the **App** scheme on a real iPhone, verify separate `com.andydoane.biblozoo.audiotest`. Full Mac Xcode/iOS SDK compile is not covered by Linux CI.
2. On the **Home screen**, both previously huge DEV diagnostic overlays are now **hidden on launch**. Only a compact **DEV Tools** button at bottom-right remains. Tap it to open the small drawer; use **Show Native Audio** and **Show Microphone Test** to reopen either original diagnostic panel if ever needed. Hide them again from the same drawer. They remain present (not deleted) and still only run when manually tapped. This compact drawer and Wacky Lab are native Audio Test-only, not shipped Web/PWA/Android or stable `ios-prep`.
3. Tap **DEV Tools → Wacky Lab · 10 Effects**. A dedicated test dialog opens directly over Home, completely separate from the normal Flashcards progress, random preset selection, grades and rewards. Nothing requests microphone permission or takes audio priority until you tap **Record a Phrase**.
4. Tap **Record a Phrase**, approve mic if needed, let visible **3…2…1** finish, speak a recognizable short sentence for ~3–5 seconds, then tap **Stop Recording** (also auto-stops by ~10 seconds). Check it reports one ready *temporary RAM-only take*. You can select **Original Voice** to compare, then Stop Playback.
5. Tap **each of the ten labeled effect buttons** from the table, in any order; hear your *same exact recorded phrase* in every effect. After a preset finishes, you can replay it again, choose another, or stop it early via **Stop Playback**. No need to advance through Flashcards or hope the random button chooses the one you need. Keep an ear out for silence, clipping/distortion, pitch discontinuities, unexpectedly truncated tails or playback duration too long. Long reverb for Cave/Demon should remain audible past spoken voice, without a false early success.
6. **Close Wacky Lab (×)**. It must stop any mic/voice output and discard the RAM take. Reopen Wacky Lab: there should be no old voice ready to play. Record anew to test again. It must not modify profile, verses, Zoo, grade, rewards, or original session counters.

## Verify child-facing original Flashcards behavior as a second gate

- Start a **normal Flashcards** session from Home. Record via the normal challenge with original visible 3→2→1 and live 16-bar meter; Stop and tap **Play My Recording**. The Wacky Replay button must **NOT** show before normal voice has truly finished and `biblozooCapturePlayback(kind:ended)`/native `.dataPlayedBack` has confirmed completion.
- Once the normal voice is actually heard in full, the original Wacky Replay button appears and chooses **one of the ten random official effects**, not a dev lab option. On actual native playback started, it is consumed once per run and cannot award duplicate grade/Zoo rewards or auto-play again. Failed startup should still let the child retry; pausing, changing verse or app switch must not claim an unheard effect as a completed normal voice.
- Confirm Wacky voice playback stops on explicit Stop/navigation, held App Switcher or lock, AirPods device unplug/route change and genuine iOS audio interruption. No automatic mic/effect restart when returning. Keep N7d.2 audio priority: a genuine BibloZoo Wacky tap should pause Apple Music/YouTube PiP and not auto-resume it after normal Wacky end; *a new physical AirPods Play* can still interrupt active BibloZoo playback.
- Test 1–2 second speech and a longer (~20 second) take for variable pitch and rate; optionally try quiet recorded words. Compare Squirrel/Giant/Sleepy/Rocket timings to normal dry voice; roller/ascending/descending should progress across the take without skipping words. A genuine OS/audio-denial should fail honestly and remain retryable.
- No separate audio file, cloud upload, raw PCM over JS bridge or microphone-to-speaker monitoring. The preset ID and opaque take ID may cross the bridge; the Float32 samples must stay bounded on the native serial capture worker and be used only for native output.

## Regression and next PR policy

New `node scripts/validate_native_n7e_wacky_replay.js` checks ten exact ids/source inventory, native AVFoundation effect nodes/mappings, in-memory PCM and actual end event, real native JS facade repeatedly playing all ten from one take, false/stale end, failure/Stop, child one-use Wacky unlock, Wacky Lab route, DEV overlay default-hidden code, original Web effects unchanged. Updated N7c/N7d regression expectations; unchanged older N1–N7d.2 and N6 suites. CI also runs whole `SceneDelegate.swift` and `BibloZooNativeSoundPlugin.swift` Swift frontend syntax parses and production Web build. **These are not AVFAudio SDK typechecks or audible iPhone validation**.

Owner reports exactly which of the ten presets pass and whether the main Home screen is now clear of both DEV overlays. A next PR must record the new merge SHA, device evidence and any corrected effects in `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, `docs/AUDIO-RECOVERY.md` and the next test guide. After all ten and child one-use behavior pass, **N7f** audits Read My Verse **OUTPUT-only** paths, then **N7g** performs full privacy/interruption/Bluetooth/PiP stability. No automatic promotion into stable iOS.

[Project handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md).
