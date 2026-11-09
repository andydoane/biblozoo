# N6n — First Verse Playground Native Audio: Verse Typer

> **CURRENT ACCEPTANCE (2026-11-09):** [N6n Verse Typer PR #55](https://github.com/andydoane/biblozoo/pull/55) **MERGED** to isolated `experiment/native-ios-audio` as `c7035e240e2e3f6af62ca23d639ea3d550065b3c` on 2026-11-09 13:20:03 UTC. The owner has now tested all usual iPhone scenarios and reports **PASS**, making this **Playground 1/5 accepted**; no individual audio-device logs were given. Older "pending" checklists below describe the **historic pre-merge owner test plan**, not current status. All **12/12 separate external games** remain accepted. [N6o Scripture Scrub PR #56](https://github.com/andydoane/biblozoo/pull/56) is OPEN, proposed second Playground, not yet owner-heard. Stable `ios-prep`, original installed app, Web/PWA/Android, mic, Zoo and user data remain unchanged.

## Accepted baseline

[Verse Scramble #54](https://github.com/andydoane/biblozoo/pull/54) **MERGED** to the isolated experiment as `76148dfd281aa91d7838908497def114756c0cfd` on November 9, 2026 02:09:43 UTC (evening November 8 in Michigan). Owner now reports Verse Scramble worked on the physical iPhone and marks it complete, making **12 of 12 external games merged and accepted**. No individual acoustic device logs were supplied; do not invent them. #49 PiP real-tap fix, four Feeding modes, Learn, previews and prior 11 games also owner-accepted to reported extent. Next focus is **Playground 0/5 accepted**, starting Verse Typer #55.

## What was deliberately migrated

Verse Typer has three different audio families. ALL THREE are covered in this PR, not just UI/gameplay effects:

| Family | Native fixed PCM / narration | Original source behavior |
| --- | --- | --- |
| Correct letters | `typer-note-55`, `-60`, `-62`, `-64`, `-65`, `-67`, `-69`, `-71`, `-72` | **Nine original source MIDI pitches**, including 55 for the Mega Ode-to-Joy melody, picked by existing `chooseMelodyForLength` and typed letter index; 130ms triangle and original 0.48 × 0.85 gain |
| Wrong key | `typer-wrong` | Two low descending sine notes, original 0.40/0.30 volumes |
| Word done | `typer-word-done` | Two-note celebration, source 72/76 pitches |
| Prompt/transition | `typer-popup` | Source 67/72 melody |
| Cocoon open | `typer-cocoon` | Source 60/64/67/72 ascending four notes |
| Butterfly flaps | `typer-flap0`, `-flap1`, `-flap2` | Three alternating source pairs (base 76/78/80 and +7) |
| Fly away | `typer-fly-away` | Source 72/76/79/84 four-note flight |
| Title/Help/mode/menu UI | `ui-pop-1`, `ui-pop-2` | Original two shared UI MP3s |
| **Spoken review chunks** | **Existing native N5b narrator** `learn-part-<publishedVerseId>-<partIndex>` | Original actual `echoParts` review audio: first chunk `a.mp3` = native **part 1**, then b=part 2; only locally published bundled verse IDs; no invented MP3 or browser voice |

**19 fixed predecoded PCM IDs = 9 correct notes + 8 phrases + 2 UI pops**, plus existing **N5b AVAudioPlayer narration** (separate long-form native player already present, no second AVAudioSession). The clips are synthesized once on the **sole serial `.soloAmbient` `AVAudioEngine` worker** during a real child's gesture; original game note durations/gains and multi-note offset patterns are baked in. The five Playground apps are distinct from the already migrated 12 practice games; no new all-app-complete claim.

## Audio and interruption contract

- **Native iOS-only sound routing:** no audible HTML, Web Audio, silent Web MP3 priming, unlocked Web oscillator, generic synthesized replacement sound, or newly owned AVAudioSession. Verse Typer's existing Web/PWA/Android audio and layout remain. For the title and Help, real pointer tap can prewarm only two UI pops. A real difficulty tap, Game Menu Close, failure-only Retry and normal Welcome Back **Let's go** prewarm all **19** before accepting typing or advancing timers. Native hot note/phrase calls only schedule already-prepared PCM. No popup on normal successful preflight.
- **Spoken chunk review is real native narration:** the source `echoPartFileByIndex` is translated to a strictly bounded `learn-part-verseId-index`, verified against the already existing native published verse manifest and bundled audio. The same native N5b `prepareNarration`, `seekNarration`, `playNarration`, `getNarrationState`, `stopNarration` and `biblozooNarration` requestId-specific **ended** callback control each review. `accepted:true`, duration and JS timers **must NOT advance the review**. An audio failure stays on accessible failure-only Retry/Back. If a verse has no `echoParts`, preserve its original no-file timed fallback rather than faking narration.
- **App Switcher / PiP / menu:** UIKit App Switcher *held* while WebView looks visible, full switch, lock and YouTube PiP **PAUSED / STILL PLAYING** invalidate old PCM and pause the same caterpillar/butterfly and virtual clock; only a new real **Let's go** tap can reclaim priority. Native voice interrupted mid-chunk records the last polled playback position, and after explicit successful return the **same chunk** prepares and seeks near that position. An OS `activation-os-rejected` is temporary/retriable plain Welcome Back, never native file corruption. A Game Menu/Help open freezes current typing and review, stopping old PCM/narration; closing prewarms the bank before releasing time/keys. Keep typed letters, streak, rewards, same word/verse and Mega melody intact; no ghost sounds or double completion.
- **Two kinds of audio gates remain distinct:** short PCM bank prepared/accepted ≠ speaker audible; native narrator `ended` ≠ proof of intelligible voice; CI source mocks ≠ Mac Swift compile/human hearing. Do not infer iOS output from Web/PWA/Android tests or enable a covert Web fallback. The old app remains separately installed.

## Your ordinary GitHub Desktop / VS Code / Xcode test workflow

**No unusual Node commands needed for regular acceptance.** First confirm the PR's **final HEAD** shows both GitHub Actions jobs GREEN (Node regressions and production web build). Then:

1. **You merge PR #55** on GitHub into the isolated `experiment/native-ios-audio` branch. (We intentionally use your existing merge-first, owner-tests-second process for this separate experimental bundle.)
2. In **GitHub Desktop**, select the `experiment/native-ios-audio` branch in your dedicated **biblozoo-native-audio** checkout and click **Pull origin**. Do **not** switch stable `ios-prep`.
3. In that VS Code terminal, paste only your familiar one-liner:

   ```bash
   npm run build && npx cap sync ios && npx cap open ios
   ```

4. Select physical iPhone, **App** scheme, separate **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) in Xcode and press **Play**.
5. Try the checklist below and report **PASS** or what's wrong. If issues appear after experimental merge, we can make a narrowly scoped corrective PR.

Optional *only if troubleshooting*: `node scripts/validate_native_playground_verse_typer_n6n.js`, `node scripts/validate_native_verse_scramble_n6m.js`, `node scripts/validate_native_pip_takeover_n6h2.js`, and `node scripts/validate_native_only_ios_output.js`. CI already runs its relevant Node checks.

## Physical iPhone listening and behavior checklist

1. **Title and difficulty:** Home → Verse Playground → **Verse Typer**, Start, How to Play, Back, choose Beginner/normal/harder as available. Hear UI pop or observe the known deliberately suppressed too-late first cold pop. After difficulty tap, the full bank prepares **quietly** before gameplay begins; no routine gray popup.
2. **Typing and melody:** Hear multiple **different triangle pitches** when tapping correct letters (including long words and Mega/Ode to Joy stage), low two-note wrong key, two-note word-completed sound and prompt melody. Physical keyboard and on-screen keys work. No missed keystrokes, false completions, or changed streaks.
3. **Cocoon and butterfly:** Cocoon prompt and opening should make their multi-note tune; repeated wing flap sounds vary over three pairs; fly-away has its own four-note rising sequence. Check animation and badges/rewards match the original app.
4. **Spoken chunks:** Use a published verse with `echoParts`, e.g. **John 3:16** and **Psalm 23:4**. During each “Listen X/Y” review card, actually hear the **correct verse audio chunk** before it advances to the next word. No silent, instantaneous auto-completion and no hidden HTML fallback. Test that the later b/c chunks are in order rather than repeating a. This path is deliberately included in N6n.
5. **Menu, mute, failures:** During typing and during a spoken chunk, open Game Menu and Help, close and return to **the same** word/melody/chunk near its paused point. Check intentional mute/unmute (no sounds while muted), mode change/Back, and rapid repeated taps. Genuine native failure shows accessible Try Again and Back, not a fake "sound accepted" popup.
6. **Held App Switcher and YouTube PiP:** Try *mid-typing* and *mid-spoken chunk* with swipe-up-and-**HOLD** App Switcher; return and tap plain Welcome Back **Let's go**. Repeat with YouTube PiP **PAUSED**, then **STILL PLAYING** while tapping back to BibloZoo. The exact typed word/animation/review checkpoint must remain; no automatic voice on foreground, no silent running clock, no Zoo Break caused by audio denial.
7. **Regressions:** Return Home and sample Verse Scramble, Traffic Tap, Verse Launch, Tower, Versey Bird and a few earlier standalone games. Try Feeding, Learn reference→chunks/Echo and flashcard/verse audio to ensure the shared Playground Welcome Back opt-in didn't alter existing owners.
8. **If anything fails:** Before restarting, DEV **Inspect native state** and **Copy Audio Timing Report**, note mode, verse/chunk, Xcode error, whether PiP still played, output route and iOS version. `prepared:true` and `accepted:true` do not prove your ears heard sound.

## After owner acceptance

Only mark **Playground 1/5** after the owner merges #55 and reports successful real-iPhone audio/speech/recovery. Then choose another Playground: **Scripture Scrub, Verse Jam, Wheel of Bible** or **Ghost Writer** (its microphone/recording may require N7 considerations). All **12 external practice games are already complete** and should stay that way. Mandatory PR docs: update this owner guide as relevant and `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, `docs/AUDIO-RECOVERY.md`. Mac Xcode Swift compile and audible device success are independent of Linux CI.
