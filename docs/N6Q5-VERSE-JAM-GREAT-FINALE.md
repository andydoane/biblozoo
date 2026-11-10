# N6q.5 — Verse Jam Groovy Score “Great!” C-major finale timing

> **Owner's latest actual physical-iPhone report (2026-11-09, after N6q.4 PR #63 MERGED)**: The between-round musical text phrases now sound **much better and are working fine for now**. The original `ios-prep` Web Audio transition gap is shorter; **N6q.4 deliberately waits for Swift's scoped background-groove stop acknowledgement and adds a 260ms native first-note lookahead versus WebAudio's 80ms**, so leave those recovered interstitials alone. A remaining Verse Jam issue: on the **GROOVY SCORE → Tap to Continue → Great!** action, the button visibly changes to “Great!” but the celebratory music plays late, sometimes only **after** the “Verse Jam Complete!” Ending menu appears, and may sound off. This is a human-heard failure; **Verse Jam is not yet owner-accepted**. Ghost Writer #59 is merged but still untested. The owner-accepted baseline remains **12/12 standalone and 3/5 Playground** (Verse Typer #55, Scripture Scrub #56, Wheel of Bible #57); all 5 Playground audio code slices have merged.

## Compared against the source `ios-prep` Web Audio game

Reviewed `ios-prep/verse_playground/verse_jam/game.js` `playCompletionArpeggio()` and `finishToEndScreen()`. Original user-facing sequence:

- On “Tap to Continue,” the button disables immediately and changes to **“Great!”**, single completion/verse reward is marked, existing background beat stops, and a cheerful **C-major arpeggio** starts before the End menu.
- Its **seven ascending melody notes** are exact original fixed MIDI, timing, duration, volume, and waveforms: C60 at 0.00s, E64 at .08s, G67 at .16s, C72 at .25s, E76 at .36s, G79 at .48s, C84 at .62s; a tiny sparkle C#91 at .80s (square on earlier melody, triangle on later notes).
- The original source note arrays and volume `MIX.finalArpeggio` are retained; the original web path uses `audioCtx.currentTime + 0.03` and shows its ending screen after **900ms**, allowing most of the celebratory cue to play while “Great!” is still visible. These original Web/PWA/Android behaviors are untouched by this PR.

## Why native was late and sounded uneven

The native N6q.1/N6q.4 final code performed:

1. `stopRun({keepNativeReady:true,preserveNativeFinale:true})` stopped JS beat timers then asynchronously invoked `nativeJamAudio.stopGrooveForFinale()` **without awaiting its Promise**.
2. `stopGrooveForFinale` internally sent `stopEffect("jam-groove")` to Swift, which must stop/reprepare drum, pad and filler-voice players on a **single serial playback queue**. The 12 original fixed prepared `jam-note` players were preserved, but **the stop itself still occupied that worker**.
3. `playCompletionArpeggio()` immediately scheduled the original eight notes, the first only **120ms** into the future. They could queue behind native stop/preparation; once overdue, the native due-time validator would schedule immediate playback rather than preserve correct spacing. Meanwhile the native Ending screen rendered after **260ms**, potentially before any sound, making the arpeggio feel rushed or late.

**N6q.5 changes only this native final-score handoff**, modeled after the N6q.4 now-working between-round strategy:
- `stopGrooveForFinale()` returns the **existing scoped `jam-groove` Swift worker completion Promise**, rather than discarding it. No new audio session or plugin methods.
- `stopRun()` returns this Promise to the final-score caller **only** when `preserveNativeFinale` is true. It still cancels the beat/watchdog, preserves the prepared native note bank, and performs all original child state updates.
- `finishToEndScreen()` awaits the stop before calling the original `playCompletionArpeggio()`. It uses **220ms native audio lead** following the acknowledged stop, so the first note can arrive at the hot note worker on time, then **440ms native visual hold** before rendering the Ending menu. This lets the first note(s) start during “Great!” while the musical tail continues on the End screen. These are intentional, bounded native timing values; not an assertion that native intrinsically requires them. Original web still plays at +30ms and waits 900ms.
- No new notes, volume/gain changes or new applause. Original C-major source melody, duration/volume, short sparkle, score, verse practice, Groovy total, progress, Menu, child screens, title/speed pops, Got It press and all three now-working interstitials **stay unchanged**.
- If the app becomes inactive, the current explicit-gesture/native readiness guards still prevent playback or automatic session priority takeover. Do not add Web Audio or HTML sound fallback on native, change `.soloAmbient`, touch Ghost Writer, N7 microphone, Zoo, or stable `ios-prep`.

## Regression and actual owner iPhone acceptance

New source-executing test `node scripts/validate_native_verse_jam_score_finale_n6q5.js` invokes the **real** `showGroovyScoreScreen` button handler, `stopRun`, `finishToEndScreen`, `playCompletionArpeggio` and actual native Verse Jam controller in mocked Node VM. It holds the Swift stop Promise unresolved and asserts **zero** finale note calls and no Ending menu until stop completion. Then it checks all **eight exactly original** note pitches, starts, durations, volumes and waveforms, with the first native note's 220ms lead and the End menu only after the 440ms hold. Separately checks the unmodified Web Audio +30ms score and 900ms menu behavior, Great! feedback and single-shot completion. N6q.1/3/4 and every other native-game regression, full `swiftc -frontend -parse` over plugin, and Production Web build must all pass at **final PR HEAD**.

**Owner physical iPhone steps**, only after personal merge into `experiment/native-ios-audio`, dedicated GitHub Desktop experiment worktree **Pull origin**, `npm run build && npx cap sync ios && npx cap open ios`, physical iPhone **App** scheme `com.andydoane.biblozoo.audiotest`:

1. Complete Verse Jam on **Slow/Medium/Fast**, score positive Groovy points. On GROOVY SCORE, tap **Tap to Continue** once. It should immediately say **Great!**, stop the background drums, and play the original happy **C-major ascending ending melody before the End menu appears**, with notes properly spaced. The last notes may ring across the menu transition, just like original source.
2. On “Verse Jam Complete!”, confirm original **Groove Score** value, verse completion/practiced mark exactly once, no second reward, no unexpected Welcome Back, and **Play Again**, More Playground and back navigation intact.
3. Recheck that “**Time / to / Jam!**,” “**Speed / it / up**” and “**Feel / that / groove**” still have their full original audible chord plus word notes and working intentional gap; **do not attempt to shorten their now-acceptable gap**. Opening and ending text phrases, title/speed button pops, Got It visual press and opening cue should remain correct.
4. Recheck real **held App Switcher**, background/lock and **YouTube PiP PAUSED/STILL PLAYING**: no native priority steal, no music after interruption until actual **Welcome Back → Let's go!** tap, no Zoo punishment. Other 12 accepted standalone games and 3 accepted Playground activities unaffected. Ghost Writer is independently untested.
5. If Great still plays late or sounds odd, note whether the **first** note starts before or after “Verse Jam Complete!” renders, whether notes rush or clip, and phone speaker vs headphones. Existing `[VerseJamTiming]` Xcode DEBUG logs cover between-round transitions, not the final cue; no user action needed for logging.

**Separate proof gates:** Linux Node/Swift **syntax parse**/Production Web CI green does not certify full Apple SDK/Xcode Swift compilation or physical iPhone speaker sound. Verse Jam remains NOT PASS until explicit owner physical hearing acceptance. Ghost Writer #59 remains MERGED but NOT tested; **12/12 standalone and 3/5 Playground accepted**, 5/5 Playground code migrated/merged.

[Living handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md) · [N6q.4 original interstitials](N6Q4-VERSE-JAM-ORIGINAL-TRANSITIONS.md).
