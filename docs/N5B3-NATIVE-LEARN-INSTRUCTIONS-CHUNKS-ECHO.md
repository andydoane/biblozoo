# N5b.3 — Native Learn instruction voice, Chunks/Echo, original Listen auto-start

> Owner acceptance checklist for [PR #35](https://github.com/andydoane/biblozoo/pull/35). **Native-only Audio Test experiment** on `experiment/native-ios-audio`, based on owner-merged [N5b.2 #34](https://github.com/andydoane/biblozoo/pull/34) `d9c9a4db`. Stable `ios-prep` / main / original installed BibloZoo **untouched**. Owner alone reviews and merges.

## Most recent evidence / what this PR fixes

Owner confirms N5b.2 real Learn Listen reference/full verse and app-switch recovery worked exactly as described on physical iPhone. New tap-to-play was a transitional precaution that differed from stable app. Short Learn instruction speech was silent as forecast. Entering Chunks triggered an *unexpected* **Welcome Back → Let's go! → Zoo Break**; the Chunks' old HTML narration was blocked by the native-only output gate, and the old Web-era recovery interpreted that as a problem. **This was not intended child-facing behavior and must not remain.**

N5b.3 makes native output available for short instruction tracks (including `instructions_echo_start` for intermediate levels), two Chunks passes (reference at part index 0, then a/b/... from the verse's `echoParts` list), and Echo speech. The *native* session is primed on the child's existing instruction **Continue** tap, and Listen narration begins after the slide without a redundant button when priming succeeds. The fallback Listen button stays available if the first activation refuses. Returning from App Switcher remains silent until a separate deliberate **Let's go!** tap.

Only one live native request and sound ID may satisfy each awaited part; `AVAudioPlayerDelegate`'s **current** ended callback—not a resolved `play()`, a JS timer, Web HTML ended, or an unrelated UI tap—permits a new chunk and eventually the next original Learn instruction. Native duration drives original chunk silence (~35%, min 500 ms) and Echo repeat window (1.25×). A rejected clip never completes a pass, and its ordinary **Start** retry is independent of the existing Zoo Escape. No Web/HTML fallback.

**Swift resource policy:** current allowlisted local `instructions_{key}` files and published verse IDs from bundled `public/verse_data/verse_list.json` plus per-verse JSON `published:true`. Chunk index is bounded by that verse's own `echoParts` list, ref `_ref.mp3` is part 0, part 1=a, etc.; metadata with no echo parts falls back to whole verse. Only actual files in Xcode-bundled `public/verse_audio` are accepted, no client URLs/filesystem paths.

## Source/CI and Xcode build

In **dedicated** `biblozoo-native-audio` worktree, test PR branch before merge; after **owner merges**, Fetch/Pull experiment base and run:

```sh
node scripts/validate_native_learn_tracks_n5b3.js
node scripts/validate_native_learn_listen_n5b2.js
node scripts/validate_native_learn_narration_n5b1.js
node scripts/validate_native_only_ios_output.js
npm run build && npx cap sync ios && npx cap open ios
```

Build **BibloZoo Audio Test** (experimental bundle ID `com.andydoane.biblozoo.audiotest`) in Xcode and install/run on a physical iPhone. GitHub Linux Node regressions / `npm run build` do **not** compile Swift, validate the actual installed Xcode bundle, or prove the iPhone's speaker emitted sound. The source asset-checker checks all published verse audio files and static instructions against repo assets but is not Xcode acoustic proof.

## Physical iPhone acceptance steps — also to be included directly in chat

1. **John 3:16 Listen entry:** choose **Not at all** (or an appropriate Learn level), follow the short instruction. You should **hear** the instruction recording when available. Press the original **Read It To Me / Continue** button once. After the Listen slide animation, the **reference should start automatically**, followed by the whole verse, then the normal Meaning instruction. An automatic **after-slide** start is permitted only because the preceding tap already activated the native session; no playback may start automatically on task-switch return. If activation fails, the fallback **Tap to Play Verse** button is expected and must be usable.
2. **Instruction sounds:** confirm audio on Listen, Meaning, Break It Down, One More Time, Echo the Verse, Remove Words and Final Test instruction cards; for the `a_little` / `pretty_well` Learn level the alternate **Echo Start** clip should be chosen. On-screen text and Continue remain available if muted/missing.
3. **First Chunks pass:** after Break It Down, native audio should **actually speak the reference then each chunk** (John 3:16 a–e). Each segment should sound once and have a short pause. It must **not** show unexpected Welcome Back/Zoo Break simply because the old Web speaker is disabled. Only after the actual last segment ends and pauses may it show **One More Time** instruction.
4. **Second Chunks pass:** the same reference+parts plays again, without skipped/duplicated clips or wrong verse. Only after the second fully heard pass should it advance to **Echo the Verse** instruction. Passing either part or whole pass requires native ended, not native `accepted` or timer alone.
5. **Echo:** the same reference+part order plays. After each clip, the chunk turns yellow and the child has roughly **1.25× that clip's duration** to repeat it. Then the next current part plays. Only the final native-ended sequence advances to **Remove Words**. No verse completion or pet/score credit merely for starting/aborting audio.
6. **Different published verse:** repeat with Psalm 23:4, ideally through Chunks/Echo. Confirm that seven Psalms chunks are read (a–g), rather than replaying John 3:16; correct next instruction and source order.
7. **Interruption:** swipe up and **HOLD** App Switcher mid-part during first Chunks; speech stops and a **plain Welcome Back** is visible. Return: **no automatic voice**. Explicit **Let's go!** must resume the **same verse, mode, part and approximate position** and complete no more than once. Repeat mid Echo (including the repeat delay), and after switching fully to another app. No Zoo Break or wrong verse/part.
8. **Muted/Back/retry:** mute while a part plays; no further native speech and no false completion. Unmute and retry via the displayed button/prompt. Open the Learn menu while speech plays: speech stops and does not unexpectedly resume when the menu closes. Exit/choose a new verse: old request must not finish the new verse. When a local file/native session refuses, the chunk screen offers **Start** retry, without Zoo Break, automatic Web output or unearned progress.
9. **Regressions:** DEV panel Play John 3:16, Pause, Skip +5s, Continue, Read Position and ×. Native app UI taps (first after cold/return may still be intentionally dropped by N5a prewarm), Classic, Melody, Labyrinth, Bounce, ordinary Learn Listen, task-switch recovery. Web/PWA/Android original narration should remain unchanged if available.
10. **If anything is silent or wrong**, use DEV **Inspect native state** and **Copy Audio Timing Report before restarting**. Note verse, mode (instruction, reference, chunk a/b/..., Echo), which voice you actually heard, and whether the button/Welcome Back/Zoo Break appeared. Native short-effect diagnostics are not microphone/acoustic timing proof.

**Explicit non-goals:** Other Hide/Final Recall timed exercises are still their original visual timers, not a voice migration. Recording, Read My Verse, mic/DSP, other games, pet/reward/progress mutations, `.soloAmbient`, Web/PWA/Android, stable `ios-prep`, and independent N8 Zoo surprise behavior unchanged.

**Next:** owner Xcode/iPhone test and decision on PR #35, then remaining N6 activities and N7 input/DSP; retain N8 independent zoo and N9 reliability/first-pop work. Every PR updates the living [project handoff](PROJECT-HANDOFF.md) in the same PR. Owner alone merges.
