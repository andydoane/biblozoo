# BibloZoo — Testing, PR Review, and iPhone Acceptance

> This document describes the **current `ios-prep` workflow**, verified against source on 2026-11-05. Check [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md), `package.json`, and the current scripts before claiming any test exists or passed. Automated checks and physical iPhone acceptance are different.

## N6q.1 — Owner-reported Verse Jam timing, false Welcome Back and delayed Great (fix proposed)

**Current verified state, 2026-11-09:** [Verse Jam #58](https://github.com/andydoane/biblozoo/pull/58) is **MERGED, not owner-accepted**. The owner physically tested it and reports it broadly works, but observed (a) 2+ seconds after Heads Up **Got It!**, (b) missing/late first interstitial “Time” / “Speed” tone, (c) **spontaneous Welcome Back** at normal final musical phrase, (d) slower “Great!” end advance and possible altered audio, (e) slower true task-switch **Let's go!** recovery rotating to a second funny message. [Ghost Writer #59](https://github.com/andydoane/biblozoo/pull/59) also **MERGED 2026-11-09 16:57:07 UTC at `b3602ad` but NOT owner-tested**. Native Playground code 5/5 merged, **owner accepted only 3/5** through Wheel #57. Prior sections describing Ghost Writer open or Verse Jam untested are historical.

**N6q.1 fix/source assertions:** Native-only iPhone prewarms the already-bounded 13-ID Jam bank on the **actual speed-select tap**, retaining it across Heads Up and consuming the same promise at Got It! (no duplicate headphone-button UI pointerdown preload). Swift note/pad PCM renders one exponential attack/decay ratio per buffer rather than per frame; real background still invalidates the bank and must require a child's real Welcome Back Let's go gesture. Redundant UIKit/visibility/Welcome pause callback teardown is deduplicated. Native beat callbacks wake **100ms ahead** and send bounded `scheduledEpochMs` only to fixed native Jam IDs; Swift revalidates the due time on its single serial worker and schedules PCM against its AVAudioEngine host clock. “Time/to/jam” and “Speed/it/up” word notes are **all queued before drawing words**, rather than requested only after DOM text is painted. Browser unchanged. Musical watchdog tolerates final-word next-measure wait and `ending_sequence` like other 8-second genuine long transitions; never turn legitimate ending into fake Welcome Back. “Great!” uses a scoped `jam-groove` stop excluding note nodes so the final arpeggio isn't clipped, and a **260ms** native-only transition instead of old 900ms. Never mark completion or award score from audio callback.

**Automated gates:** `scripts/validate_native_verse_jam_timing_n6q1.js` includes source assertions and mocked native controls for hot-bank reuse, actual due times, once-only interruption teardown, rewarm after real return, false watchdog exclusion and non-clipped finale; existing N6q/Jam and all other experiment regressions plus production Web build still must pass on **PR final HEAD**. Swift actual compilation on owner's Mac + actual speaker timing on physical iPhone are **not** covered by Linux CI.

**Owner verification:** GitHub Desktop dedicated experiment checkout → personally merge into only `experiment/native-ios-audio` after green GitHub Actions → Pull origin → `npm run build && npx cap sync ios && npx cap open ios` → Xcode App scheme physical separate audio-test install. Repeat all three speeds. Time Heads Up Got It, listen for first “Time”/“Speed” tone synchronized with visible text, finish last 8-beat line with **no spontaneous Welcome Back**, press Great! and hear full correct arpeggio with quick end screen, confirm first completion/reward once, compare true held App Switcher/full switch/Home/lock and YouTube PiP paused/still-playing **Let's go!** total phrases/latency (message changes every **2.5 s**, not evidence of extra attempts). Preserve all source voices/pads/drums, song scoring, Menu/Help/mute, other activities and untested Ghost Writer. Any false Welcome or delayed note needs the exact phase and native timing report. [Dedicated iPhone guide](N6Q1-VERSE-JAM-TIMING-FOLLOWUP.md) · [handoff](PROJECT-HANDOFF.md) · [audio recovery](AUDIO-RECOVERY.md).

## N6r — Final Playground Ghost Writer: five original spooky clips, native UI and PiP recovery (proposed)

**Accepted baseline, 2026-11-09:** Owner merged [Verse Jam #58](https://github.com/andydoane/biblozoo/pull/58) to isolated `experiment/native-ios-audio` at `4ccd11905dcabd11ca5f2eca7597782b9bb4a595` (16:29:48 UTC) but **has not physically tested it**. Owner-accepted remains **12/12 standalone and Playground 3/5** (Verse Typer, Scripture Scrub, Wheel of Bible); 4/5 Playground code merged, with Verse Jam test pending. **N6r Ghost Writer is the fifth proposed code migration, not owner accepted.** Prior N6q “proposed fourth” language below is now historical.

**Audio inventory and isolation:** Ghost Writer's actual shipping game plays exactly **five original spooky MP3 recordings** (`ghost_writer_spooky_1…5.mp3`) and **two shared UI pops**. The six shipped `ghost_writer_scribble_1…6.mp3` are dormant, so introducing scratch effects would be a gameplay change. Predecode **7 allowlisted native PCM IDs** (5 spooky + 2 UI) using the same serial `.soloAmbient` Swift `AVAudioEngine`; retain actual random shuffled five-sample bag, no immediate repeats, **900–1150ms** quiet gap after each full clip, master `0.82`, spooky `0.34`, UI `0.42`. Swift `play` returns its actual predecoded `durationMs` to time only the *next decorative clip*, not to advance handwriting or rewards. Native-only iOS never creates Web `AudioContext`, fetch-decodes MP3s or primes silent HTML. Original Web/PWA/Android output is unchanged.

**Gesture and canvas preservation:** Real Beginner/Advanced, Ghost Write!, Replay, Menu Close, unmute, Try Again and plain Welcome Back Let's go may request `activateFromGesture`; **drawing strokes, RAF, focus and passive visibility never may**. Wait for native preflight before starting the sound-enabled run. UIKit .inactive swipe-and-HOLD (even if WebKit visible), full switch/lock, YouTube PiP **PAUSED** and **STILL PLAYING** pause the same handwriting `playbackState.index`, `charStart`, `pauseUntil` and active spooky clip; cancel stale clip/gap timers without double completion. Resume exact glyph/verse/progress on a new real tap after successful preflight. OS-priority refusal is a retriable plain Welcome Back, not Zoo BREAK; missing bridge/buffer shows accessible Try Again/Back. Mute/Spooky Sounds Off stays silent.

**Unrelated “recorders”:** This Ghost Writer slice **does not touch microphone**. `MediaRecorder` uses `canvas.captureStream` to **export handwriting video**, not mic capture; the disabled developer punctuation “recorder” captures drawn glyphs only. No N7 DSP/recording architecture change. The original `markVersePracticed`/`markPlaygroundCompleted` remains once per first genuine playback completion.

**Independent gates and normal owner workflow:** New `node scripts/validate_native_playground_ghost_writer_n6r.js` checks seven real assets/Swift ID/resource bindings, not converting the six dormant scribbles, native-output isolation, mocked plugin gesture/replay duration and PiP/held App Switcher behavior. Both **final HEAD GitHub Actions Node regression and Production Web build** must GREEN. Separately **real Mac Xcode Swift compile** and **human-heard physical iPhone test** are mandatory. You merge personally only after CI green → GitHub Desktop dedicated `experiment/native-ios-audio` worktree **Pull origin** → VS Code `npm run build && npx cap sync ios && npx cap open ios` → Xcode **App** scheme physical iPhone Play.

**Owner test:** Beginner and Advanced finger training, Clear/Undo/Next and menu, first Ghost Write! actual handwriting/vapor, all **five distinguishable spooky samples** with nonrepeat gaps; Remix color/speed/tool + Spooky Sounds On/Off and mute, replay, PNG and canvas video export (if supported), held UIKit App Switcher **while visible**, full switch/Home/lock, YouTube PiP paused/still playing, Welcome Back only with tap, no silent replay/unexpected Zoo/doubled reward. Also test merged-but-not-yet-accepted Verse Jam #58. **3/5 accepted until owner reports specific tests PASS**; Ghost Writer fifth is only complete after independent iPhone validation. [N6r owner guide](N6R-NATIVE-GHOST-WRITER.md), [handoff](PROJECT-HANDOFF.md), [audio recovery](AUDIO-RECOVERY.md).

## N6q — Verse Jam: native musical PCM, original Groovy beat and interruption recovery (proposed fourth Playground PR)

**Accepted baseline, 2026-11-09:** The owner merged [Wheel of Bible #57](https://github.com/andydoane/biblozoo/pull/57) into isolated `experiment/native-ios-audio` at `46971fb8ec7456fa66892d059dea38054b8c976f` and reports full real-iPhone tests **PASS**. All **12/12 external standalone games** and **Playground 3/5** are now owner accepted. **N6q Verse Jam is NOT yet owner-merged/heard**, and must not be counted until the owner's own iPhone PASS. Historical N6p-open text below predates this update.

**Original sound contract and implementation:** Keep source Slow/Medium/Fast rhythm modes at **92, 100, 104, 108, 112, 120 and 128 BPM**; the three distinct basic/middle/final chiptune drum loops; 3-2-1-GO and six-intro-word melody; note pitches chosen by source verse position; different warmup/later note timbres; claps, original recorded **Boom!/Hey!/Woo!/Yeah!/Yo!** filler samples (five packaged MP3s); the C-major 4-note chord pad; wrong-tap notes, transition phrases, Groovy score sparkle, end sting and completion arpeggio; two existing native UI pops. All native speaker output uses **13 fixed allowlisted Swift bridge IDs** (2 UI, 5 voices, 4 drums, one finite pitch bank, one finite pad bank). Notes and pads have source-backed finite, pre-rendered memory buffers, not arbitrary hot oscillator/frequency requests. The existing single serialized `.soloAmbient` `AVAudioEngine` owns them; no new AVAudioSession or Web/HTML fallback on experimental iOS. Browser/PWA/Android keep original Web sounds.

**Musical clock/recovery:** Native Jam uses `performance.now()` as a monotonic beat clock for original timing/score calculations, dispatching each precomputed PCM sound near its scheduled beat rather than bursting all notes at bar start. Pending JS beat timers are cancelled at Game Menu, Help, UIKit inactive held App Switcher, full task switch, YouTube PiP PAUSED/STILL PLAYING, lock/route change and exit; the child returns on an explicit gesture and a clean musical downbeat. The existing current verse, already-built words, round, Groovy Score, progress and rewards must survive; no double completion. OS priority refusal is retriable through plain Welcome Back, not a gray fatal sound dialog or spontaneous Zoo Break. A real missing native PCM/bridge error has Try Again/Back; native `prepared`/`accepted` is not acoustic proof.

**Automated gate:** `node scripts/validate_native_playground_verse_jam_n6q.js` (included in the experiment's PR/push workflow) checks real game source inventory/BPMs, controller and Swift finite recipes, timed output, no native Web fallback, menu/score interruption and mocked gesture/PiP denial. Both **final PR HEAD** Node regressions and **Production web build** must show GitHub Actions GREEN before the owner merges. Linux CI does not compile Mac AVFoundation Swift or verify real speaker audibility.

**Owner's usual workflow:** You merge the PR yourself into `experiment/native-ios-audio` after both jobs green. In GitHub Desktop choose the separate native-audio checkout on `experiment/native-ios-audio` and **Pull origin**; run `npm run build && npx cap sync ios && npx cap open ios` in that VS Code folder; select **App** scheme and physical iPhone in Xcode and press **Play**. No extra Node commands are normally needed.

**Actually hear and observe:** From Home → Playground → Verse Jam, Start → Slow/Medium/Fast → headphones warning **Got it!**; all 3 modes reach a beat with the original changing drums and 3-2-1-GO. Follow the six-word intro and at least a complete verse with varying pitches, early-beat input, claps and five real voiced filler buttons. Hear the pad under later phrases, wrong notes and round transition stings, view Groovy Score and finish/end arpeggio exactly once; check Play Again and sound balance. In the middle of a drum bar, countdown, word chunk, score screen and ending, open Game Menu/Help/Mute, held UIKit App Switcher, YouTube PiP **PAUSED** then **STILL PLAYING**, full Home/switch and lock; verify no ghost notes, missing beat, unexpected score/verse progress or timed jump, resume via actual tap on a clean downbeat. Regress Feeding, Learn, 12 games, Verse Typer, Scripture Scrub and Wheel of Bible.

**Acceptance boundary:** After the owner merges, Swift builds and the real iPhone sound/interruption test is reported PASS, Playground becomes **4/5**, leaving **Ghost Writer**. Until then it remains **3/5**. N7 recording, N8 Zoo escape surprises, N9 stress/integration and stable `ios-prep` are independent future work. See [dedicated N6q owner guide](N6Q-NATIVE-VERSE-JAM.md).

## N6p — Wheel of Bible: 38 native PCM, actual verse/reference speech and wheel recovery (PR #57)

**Current owner-accepted baseline (2026-11-09):** [N6o Scripture Scrub #56](https://github.com/andydoane/biblozoo/pull/56) **MERGED** as `1aa5c7d510b542a6261e47f82a07ce5589f6f41b` at Nov 9 14:36:40 UTC, and owner now reports routine real-iPhone tests, task switches and interruptions **PASS**. Playground **2/5 accepted** (Verse Typer, Scripture Scrub), **three remaining**, while **12/12 external games** also remain accepted. The older #56 OPEN text below reflects its historic pre-merge acceptance plan, NOT current status. [N6p Wheel of Bible #57](https://github.com/andydoane/biblozoo/pull/57) is OPEN, proposed third of five; **not merged or actually iPhone-heard yet**.

**Source-exact sound inventory:** Original Wheel `playTone` makes **36 finite distinct combinations** of MIDI, duration, volume and square/sine/triangle waveform, including 22 real wheel-spin ticks spaced 95ms (3 repeating low squares 50/53/56), 3 intro beeps, 2 good/cash notes, eight word-challenge correct pitches, two low wrong notes, five pop variants, three prize and three hint notes, seven randomized fireworks. Together with existing 2 UI pops, **38 allowlisted fixed PCM IDs** pre-rendered at real Start/Close/Let's go gesture on the sole serial Swift `.soloAmbient` AVAudioEngine; Web/PWA/Android source oscillators remain original. Source note envelope is 12ms rise, original duration/volume and master .82 baked, same original 22-tick wheel timeline. No hot synth, arbitrary caller-pitch/URL, second audio session, HTML silence prime, Web fallback, or automatic foreground priority. **Spoken Meet Verse intro is ALSO migrated:** native N5b published `learn-verse-<id>` followed by `learn-ref-<id>` AVAudioPlayer, matching `biblozooNarration` requestId `ended` required. A successful `playNarration` acceptance or timer is never considered actually heard.

**State and interrupts to verify:** source wheel sector selection, spin tick index, three-note good/prize/hints, keyword melody selection, Bible Bux, prize bag and final 60s countdown stay the SAME across native Game Menu/Help, held UIKit App Switcher while WebView visible, lock, YouTube PiP PAUSED and STILL PLAYING. Pause `BibloZooWelcomeBackClock`, timers and visible animations; only actual Start, Close, Retry or plain Welcome Back **Let's go** gesture may restore 38 PCM before unpausing. Spoken verse and ref may stop mid-clip; approximate last-position `seekNarration` after genuine tap, never a silent completed verse or ghost callback. Real OS denial stays ordinary retriable Welcome Back, not terminal audio-corrupt modal. True bridge/PCM/narration faults show accessible Retry/Back.

**Owner's preferred normal procedure** after **both GitHub Actions jobs GREEN on final PR HEAD**: merge #57 personally to `experiment/native-ios-audio` → GitHub Desktop dedicated `biblozoo-native-audio` checkout select that branch and **Pull origin** → VS Code terminal `npm run build && npx cap sync ios && npx cap open ios` → Xcode physical iPhone separate **App** scheme `com.andydoane.biblozoo.audiotest` → press **Play**. No unusual manual Node commands needed; GitHub automatically runs `scripts/validate_native_playground_wheel_n6p.js` plus previous native games/Playground/PiP regressions and Production Web build. **Mac AVFoundation Swift compilation and human-audible phone output are independent gates**.

**Listen/observe:** actually hear three intro beeps, full published spoken verse THEN matching reference before Spin, 22 changing low-square wheel ticks (no late ghost after task switching), cash/prize stings, wrong/hint and eight selectable keyword notes, final fireworks and 60s finale, exact existing prize/Bible Bux score; Game Menu during spin and spoken intro, Help/Back/mute/unmute, held App Switcher, YouTube PiP paused and still playing. Back Home and sample Typer real spoken chunks, Scripture Scrub progress/mower and 12 earlier standalone games, Feeding, Learn, previews. If silent or Xcode compile fails, before restart DEV Inspect native state and Copy Audio Timing Report, save Swift compiler errors and note which verse/ref, sector/tick/bonus, PiP state, speaker route. Only after owner iPhone PASS may Playground count **3/5**, leaving Verse Jam and Ghost Writer. [N6p dedicated owner test guide](N6P-NATIVE-WHEEL-OF-BIBLE.md). Every PR maintains handoff, TESTING, AUDIO-RECOVERY and dedicated guide; stable `ios-prep`, old app and Web/PWA/Android untouched.

## N6o — Scripture Scrub: 28 native PCM IDs, original progress melody and mower (PR #56)

**Current owner-accepted baseline (2026-11-09):** [N6n Verse Typer #55](https://github.com/andydoane/biblozoo/pull/55) **MERGED** into isolated `experiment/native-ios-audio` at `c7035e240e2e3f6af62ca23d639ea3d550065b3c` 2026-11-09 13:20:03 UTC, and owner reports **all scenarios worked on physical iPhone (PASS)**. **Playground 1/5 accepted**, four left. **All 12/12 external standalone games accepted** since #54. Prior N6n "OPEN/pending" sections below are historical pre-merge acceptance plans, not the current baseline. New [N6o Scripture Scrub PR #56](https://github.com/andydoane/biblozoo/pull/56) is **OPEN / NOT owner tested**: proposed second Playground, **do not count 2/5** yet.

**Exact audio contract:** Scripture Scrub defines **18 original bundled MP3 effect keys**, excluding an additional dormant `scripture_scrub_peel.mp3`; preserve original choice/rand nonrepeat for three cookie bites, five sticker pops, scratch/dig/chalk/rainbow/glow/splat/squeak/leaves/popup etc. Original source scrubbing progress melody is triggered every **2%**, throttle at **90ms** and repeats only **seven note pitches** (196, 261.63, 293.66, 329.63, 349.23, 392, 440 Hz) from an original 28-note sequence. Completion arpeggio is four separate G4/C5/E5/G5 notes at original 95ms spacing. Existing 2 shared UI pops. This is **28 fixed native PCM IDs** on sole existing `.soloAmbient` serial AVAudioEngine worker; no hot Web oscillator, native HTML silence, Web decoder/fallback or arbitrary sound paths. Original mower MP3 preloops into a bounded **1250ms native PCM fade**; new allowlisted `stopEffect(scrub-mower)` cancels only mower without evicting the other warmed sounds. Web/PWA/Android audio is untouched. Real Start, Menu Close, failure Retry and plain Welcome Back Let's go gesture-prewarm all 28. Menu/PiP/held App Switcher freeze the same brush, coverage, mower visual/clock, four random groups+Archaeology and rewards; `activation-os-rejected` remains temporary Welcome Back, never a silently running game or fake corruption screen.

**Your familiar owner procedure (no extra Node commands needed):** after both **final HEAD** GitHub Actions **Node regression** and **Production Web build** jobs GREEN, merge PR #56 personally into `experiment/native-ios-audio`, then GitHub Desktop on dedicated native-audio checkout **Pull origin**, VS Code run `npm run build && npx cap sync ios && npx cap open ios`, then Xcode **App** scheme/physical iPhone (`com.andydoane.biblozoo.audiotest`) **Play**. CI automatically runs `scripts/validate_native_playground_scripture_scrub_n6o.js` plus N6n Typer and earlier sound/PiP regressions; Mac Xcode Swift compilation/human-ear output independent.

**Phone checklist:** Start/Help/Back pop; random Mud/Paint/Fog/Chalkboard/Glow/Rainbow progress-note pitch changes and completion fanfare; 3 cookie bites, 5 sticker pops, Leaves and all intro sounds; Mower 1250ms loop/fade and targeted stop; open Game Menu/Help/Mute mid-scrub or mower, return same percentage/brush/mower lane; held UIKit App Switcher **swipe up and HOLD**; YouTube PiP paused and STILL PLAYING during mower; final Archaeology Bible score and reward; back Home and regress accepted Typer speech chunks, 12 games, Feeding, Learn, previews. Source randomized 4 rounds+final Archaeology means several plays may be needed to hear each family. After interruption, true `activation-os-rejected` can wait behind ordinary retriable Welcome Back. If silent/build failure, before restart DEV Inspect native state + Copy Audio Timing Report; capture Xcode errors, round, audio route, whether PiP still played. Swift `prepared` or `accepted` means scheduled only, not human heard.

**Independent signoff:** final-head Node+Web CI + Mac Swift Xcode build + owner-heard physical iPhone effects/recovery. Only after owner merges and reports PASS count **Playground 2/5**, leaving Verse Jam, Wheel of Bible and Ghost Writer; all 12 external games remain complete. Stable `ios-prep`, installed app, Web/PWA/Android, microphone and progress untouched. [N6o detailed owner guide](N6O-NATIVE-SCRIPTURE-SCRUB.md). Every PR must update this TESTING guide, `docs/PROJECT-HANDOFF.md`, `docs/AUDIO-RECOVERY.md` and dedicated guide.

## N6n — Verse Typer Playground native PCM + native spoken chunk review (PR #55)

**Latest owner-accepted baseline (2026-11-08 local):** [N6m Verse Scramble #54](https://github.com/andydoane/biblozoo/pull/54) **MERGED** `76148dfd281aa91d7838908497def114756c0cfd`; owner now reports real iPhone **PASS**. All **12 of 12 external standalone games accepted**; that does NOT mean all Playground/recording/native app audio is complete. Historic N6m/#54 OPEN text below predates this report and is superseded. The new [N6n Verse Typer Playground PR #55](https://github.com/andydoane/biblozoo/pull/55) is OPEN/NOT MERGED and **Playground 0/5 accepted**.

**Scope to verify:** N6n is the first of five Playground apps. Verse Typer gets **19 native PCM fixed IDs**: 9 original correct-letter MIDI pitches incl Mega MIDI55, 8 exact wrong/word/popup/cocoon/flap0–2/fly-away musical phrases, and the 2 existing UI pops. Its original spoken `echoParts` review must **also** use the existing published-verse N5b AVAudioPlayer narrator `learn-part-verseId-index`, with native **ended** (not `accepted` or a timeout) advancing the review, requestId protection, and same-part approximate-position retry after task switch. Preserve Web/PWA/Android original AudioContext and HTML narration. Existing single serial Swift `.soloAmbient` PCM worker; real mode/Menu Close/Retry/Let's go gesture preflight all 19 before keyboard/clock resume, native-only no Web/HTML fallback.

**Owner's normal acceptance workflow, no extra terminal diagnostics required:** wait until GitHub Actions for PR #55 has **both final-head Node regressions and production web build GREEN**; owner merges PR personally to isolated `experiment/native-ios-audio`; in GitHub Desktop select that branch and **Pull origin**; in dedicated native-audio VS Code folder run exactly `npm run build && npx cap sync ios && npx cap open ios`; choose physical iPhone and App scheme for `com.andydoane.biblozoo.audiotest` in Xcode and press **Play**. Test actual audio. CI automatically runs `node scripts/validate_native_playground_verse_typer_n6n.js` plus prior game/PiP/other regression scripts; Mac Swift compilation and actual speaker sound are separate gates.

**Listen/observe:** initial title/mode UI pops (known first cold pop may be suppressed by deadline); 9 correct pitches across different words and Mega melody, wrong-key bass, word done, popup, cocoon four-note open, three distinct flap pair variants and fly-away. John 3:16/Psalm 23:4 spoken review parts a/b/c must actually **finish** before continuing. Test Game Menu/Help/mute during typing and mid-spoken chunk, then return to same text and chunk. Held App Switcher thumbnail, full switch, YouTube PiP PAUSED and STILL PLAYING, cold Home and old twelve external games plus Feeding/Learn regressions. Genuine OS interruption remains plain retriable Welcome Back; no automatic voice on foreground. If silence/retry occurs, before app restart DEV Inspect native state and Copy Audio Timing Report; note part index/verse and which speech was heard. See [N6n complete owner guide](N6N-NATIVE-VERSE-TYPER.md).

**No false signoff:** Node mocks, successful Swift `prepare/play` statuses or even Mac compilation do not prove human audibility. Only after physical owner PASS can Playground become **1/5**, while the 12 standalone games remain complete. Future Playground candidates Scripture Scrub, Verse Jam, Wheel of Bible, Ghost Writer (recording intersects N7). Every PR maintains the living handoff, TESTING, AUDIO-RECOVERY and owner guide. Stable `ios-prep`, Web/PWA/Android and original installed app unchanged.

## N6m — Verse Scramble final 18-ID native PCM, source melodies and physical iPhone gate (PR #54)

**Owner-reported baseline (2026-11-08 Michigan):** [N6l Traffic Tap #53](https://github.com/andydoane/biblozoo/pull/53) **MERGED** `e0defada177a723401d3968c29fde99e4ecc827d` (2026-11-09 UTC), with successful real-iPhone owner testing reported. **11/12 standalone native games owner accepted.** The older N6l/#53 OPEN language below describes its historical pre-merge plan; do not mistake it for current status. [#49](https://github.com/andydoane/biblozoo/pull/49) PiP real-tap fix and #50/#51/#52 also owner-accepted.

**New [N6m final Verse Scramble #54](https://github.com/andydoane/biblozoo/pull/54) OPEN / NOT owner-heard yet.** Preserves exact original 1–10 letter melody choices across eight MIDI pitches (60,62,64,65,67,69,71,72), plus eight fixed original synthesized wrong/word/Fridge Slide/title/bonus tunes, and two shared UI pops = **18 unique precomputed Swift PCM IDs** on sole serial `.soloAmbient` AVAudioEngine. Original Web/PWA/Android AudioContext and five *unused* Scramble pop MP3s remain untouched. No Web or HTML iOS fallback, no generic chirp or hot synthesizer. On physical iPhone hear multiple correct-note pitches, wrong, word complete fanfare, falling magnet noise, message pop, bonus Start/You Win/I Win/final. Preserve verse, selected melody, streak, profile rewards, instructions and five-round bonus pointer.

**Owner's ordinary workflow:** after final PR HEAD GitHub Node regressions and production web build **both GREEN**, owner merges #54 personally to isolated `experiment/native-ios-audio` → GitHub Desktop selects that branch and **Pull origin** → dedicated VS Code terminal runs `npm run build && npx cap sync ios && npx cap open ios` → **App** scheme physical iPhone (`com.andydoane.biblozoo.audiotest`) Xcode Play. **No unusual Node commands needed**; Actions runs `scripts/validate_native_verse_scramble_n6m.js`, all other 11-game/PiP/global regressions and web build. During actual phone test try mid-bonus/letter held App Switcher, YouTube PiP PAUSED and STILL PLAYING, ordinary Menu Close, Mute, Home and older games. Any issue: before restarting DEV Inspect native state + Copy Audio Timing Report. **Linux CI does not compile Mac AVFoundation or prove audible speaker output; count final 12/12 only after owner merged and heard PASS.** [Dedicated detailed N6m owner testing guide](N6M-NATIVE-VERSE-SCRAMBLE.md).

## N6l — Traffic Tap 1 original zoom MP3 + 13 Swift-generated PCM sounds and PiP (PR #53)

**Latest accepted baseline:** [N6k Verse Launch #52](https://github.com/andydoane/biblozoo/pull/52) is **MERGED** at `21912befabff7f7e3819ed0b01349db579447319` and owner now reports **usual iPhone tests PASS / no issues**. This raises native standalone acceptance to **10/12**. [N6j Tower #51](https://github.com/andydoane/biblozoo/pull/51), #50 Bird and #49 PiP are also merged and owner-accepted to reported extent. The N6k/#52 text below was written as the historical pre-merge acceptance plan, not the present status.

**Current [N6l Traffic Tap PR #53](https://github.com/andydoane/biblozoo/pull/53) OPEN, NOT OWNER-HEARD.** Fixed 16 native PCM IDs: one packaged `sound_zoom.mp3` at original volume 0.25, 13 generated sounds (correct tap, wrong tap, truck intro/outro, rainbow jackpot, all eight distinct two-note bonus streak pairs) with gains and pitch sweeps baked in Swift, plus existing two UI pops. One serialized `.soloAmbient` `AVAudioEngine`; no Web/HTML native fallback, no new session. Verify title/Help/Back/difficulty, Game/Speed Close before unpause, real held App Switcher and PAUSED/STILL PLAYING PiP return, road vehicles/truck/rainbow bus, saved verse/bonus score/streak/medals, and prior-ten game/Home sound. True OS refusal remains plain Welcome Back.

**User's normal owner workflow is sufficient:** when GitHub final-HEAD Node regression and production web CI are GREEN, **owner merges PR #53** personally, opens **GitHub Desktop** on `experiment/native-ios-audio` and clicks **Pull origin**, runs in dedicated VS Code folder `npm run build && npx cap sync ios && npx cap open ios`, selects physical iPhone with **App** scheme of test bundle `com.andydoane.biblozoo.audiotest`, presses **Play** and reports audible PASS or issues. No unusual terminal commands required: CI runs `scripts/validate_native_traffic_tap_n6l.js` and all previous native/PiP checks automatically. If failure, before restarting use DEV Inspect native state and Copy Audio Timing Report. **Mac Swift build and human audible iPhone proof are independent of Node/Web CI.** Only count 11/12 after owner device PASS. [Dedicated N6l guide](N6L-NATIVE-TRAFFIC-TAP.md).

## N6k — Verse Launch 14 fixed native PCM sounds / owner test (PR #52)

**Current 2026-11-08 owner status:** [Tower of Bible N6j PR #51](https://github.com/andydoane/biblozoo/pull/51) is **MERGED** as `1593a98bb60709582e8fa6b1a5fd4ac9a7e9d07d`; the owner now reports successful real iPhone normal tests without issues, making **9/12 standalone games accepted**. Versey Bird #50, PiP #49 also owner accepted. Prior N6j status text below describes **its historical pre-merge testing plan**, not today's count.

**New [N6k Verse Launch PR #52](https://github.com/andydoane/biblozoo/pull/52) is OPEN / not yet owner-heard.** Eight original packaged gameplay MP3 effects plus four fixed native-precomputed countdown/alternating projectile tones (C4, C5, tick, tock) plus two shared UI pops = **14 distinct prewarmed Swift PCM IDs**. `wordAdded` and `starCollected` reuse the one collect PCM. Native only uses sole `.soloAmbient` Swift `AVAudioEngine`; Web/PWA/Android original audio remains. Check mode/Help/Back/menu UI, Game/Speed Close bank prewarm, asteroid/space bonus menu and projectile, countdown 3 low+final high, 8 MP3 sounds, score/verse/bonus/medals, no early clock advance, held App Switcher and PiP PAUSED and STILL PLAYING, cold Home, nine previous games/Feeding/Learn.

**Owner's normal workflow (no extra Node commands):** wait for final-HEAD GitHub Node + Production web build CI GREEN; **owner manually merges #52** to isolated `experiment/native-ios-audio`; GitHub Desktop **Pull origin** on that branch; from native VS Code folder run `npm run build && npx cap sync ios && npx cap open ios`; select physical iPhone App scheme of separate `com.andydoane.biblozoo.audiotest`, press **Play**, listen. If trouble, before reboot DEV Inspect native state + Copy Audio Timing Report. CI automatically runs `scripts/validate_native_verse_launch_n6k.js` plus previous native/PiP regressions and web bundle. It does not compile Mac Swift or establish audible iPhone output; count 10/12 only after owner merge and reported physical PASS. [Detailed N6k guide](N6K-NATIVE-VERSE-LAUNCH.md).

## N6j — Tower of Bible native PCM, generated word cues and physical iPhone gate (PR #51)

**Current progress (2026-11-08):** [N6i Versey Bird #50](https://github.com/andydoane/biblozoo/pull/50) is **MERGED** as `5d6378f`, and the owner now reports real-iPhone **testing successful**. This raises standalone native games to **8/12 owner-accepted**. [N6h.2 PiP #49](https://github.com/andydoane/biblozoo/pull/49) was likewise merged and owner reports multi-scenario PiP recovery PASS. The prior N6i/#50 OPEN notices below are **historical pre-merge checklists**, not current status.

**New [N6j Tower PR #51](https://github.com/andydoane/biblozoo/pull/51) is OPEN/NOT MERGED.** It adds **6 shipped Tower MP3s + 2 fixed Swift-generated word cues + 2 shared native UI pops** (10 fixed IDs) to the sole `.soloAmbient`/prewarmed `AVAudioEngine` PCM worker, preserving Web/PWA/Android original audio and Tower gameplay. Verify original ascending 4-note correct and 2-note wrong sounds (frequencies and authored volume baked into native PCM) plus brick land, warning 1/2, collapse, break, streak; title/mode/Help/Back, full mode preflight, Game/Speed Close, mute, Frenzy bomb, warning/collapse, physics/score, no early unpause, held App Switcher and PiP STILL PLAYING/paused/OS denial, Home after exit and old eight native games/Feeding/Learn.

**From VS Code in the separate `biblozoo-native-audio` folder:** `git fetch origin`, `git switch --track origin/experiment/n6j-native-tower-of-bible` (or `git switch experiment/n6j-native-tower-of-bible && git pull --ff-only origin experiment/n6j-native-tower-of-bible` when already present), `npm ci`, `node scripts/validate_native_tower_bible_n6j.js`, `node scripts/validate_native_versey_bird_n6i.js`, `node scripts/validate_native_pip_takeover_n6h2.js`, `npm run build`, `node scripts/validate_native_only_ios_output.js`, `npx cap sync ios`, `npx cap open ios`. Use **App** scheme for separate BibloZoo Audio Test `com.andydoane.biblozoo.audiotest` on a physical iPhone. **Final PR HEAD Node/regression and production web CI GREEN**, independent **Mac Xcode Swift compile**, and **owner actually hears iPhone effects** are three distinct gates. Only owner merges, then count becomes 9/12 after reported successful test. Full [N6j owner guide](N6J-NATIVE-TOWER-OF-BIBLE.md). Any silence: before restarting DEV Inspect native state + Copy Audio Timing Report and note PiP playing/paused.

## N6i — historical owner-merged Versey Bird (#50, device PASS reported)

**Current corrected status (2026-11-08):** [PiP #49](https://github.com/andydoane/biblozoo/pull/49) is **MERGED** as `d19a314`; the experiment branch's [post-merge Node + web CI](https://github.com/andydoane/biblozoo/actions/runs/42530212683) passed. The owner subsequently reports successful audio recovery across multiple real-iPhone PiP tests, superseding #48's historical paused-vs-still-playing failures and #49's pre-merge pending marker. Exact scenarios/devices were not provided. Seven game migrations are currently accepted; [N6i Versey Bird open PR #50](https://github.com/andydoane/biblozoo/pull/50) is the proposed eighth and **not yet owner-tested/merged**.

**Before owner merge:** in the dedicated `biblozoo-native-audio` VS Code terminal, fetch the PR branch `experiment/n6i-native-versey-bird` (NOT stable `ios-prep`). Run `node scripts/validate_native_versey_bird_n6i.js`, `node scripts/validate_native_pip_takeover_n6h2.js`, `npm ci`, `npm run build`, `node scripts/validate_native_only_ios_output.js`, `npx cap sync ios`, `npx cap open ios`. The N6i test is also mandatory in GitHub Actions' full Native Audio Node regression checks. Check both PR jobs green **on final HEAD**. Those checks cannot compile Swift or establish actual speaker output.

**Physical iPhone tests:** after building **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) in Xcode, hear four randomized flap MP3 variants plus bee/boulder/correct/wrong/streak/pipe sounds and fixed UI pops; start/mode/Help/Back, Game Menu/Speed Close full prewarm, pause/mute/retry/Back and no routine gray popup; repeat the halfway nap *document reload* and tap-to-wake while preserving the saved checkpoint; held App Switcher/full return, PiP with YouTube PAUSED then STILL PLAYING, cold launch under existing PiP and Home after game; regress existing seven games, Feeding four modes, Learn and previews. Verify sound **by ear**, no automatic foreground session takeover and same score/verse/bonus/timers. On failure BEFORE app restart DEV Inspect native state + Copy Audio Timing Report. [Full N6i steps and copyable commands](N6I-NATIVE-VERSEY-BIRD.md).

**Historical status when #50 was open:** the owner has since merged #50 and reported successful real-iPhone testing; Versey Bird now counts as the eighth accepted game. Same PR updates the living handoff and this testing guide. Owner alone merges.

## N6h.2 — historical #48 failures and #49 corrective design: from STILL-PLAYING YouTube PiP (PR #49)

**Latest owner REAL iPhone report after [PR #48](https://github.com/andydoane/biblozoo/pull/48) was merged** into `experiment/native-ios-audio` at `a7d5660b`: normal native game audio works; **YouTube PLAY then PAUSE before returning** → plain Welcome Back Let's go! resumes correctly (**PASS**). **YouTube PiP STILL PLAYING while returning** → Let's go! only flashes status/no resume (**FAIL**). **Cold launch BibloZoo while YouTube PiP already PLAYING** → Home sound absent; mode selection cannot progress in **any** of the seven migrated games (**FAIL**). #48 is merged but only **partially** accepted, NOT a complete PiP fix. [N6h.2 corrective PR #49](https://github.com/andydoane/biblozoo/pull/49) was subsequently MERGED as `d19a314` and owner later reported successful PiP recovery on iPhone. The failing cases above describe the older #48 build, not the current #49 result.

The error in #48 was `AVAudioSession.isOtherAudioPlaying` vetoing even a **genuine** `activateFromGesture`, plus deferring an active interruption while PiP was still playing. Apple's existing `.soloAmbient` is **nonmixable**; on a foreground **real user tap**, its original `setActive(true)` entrypoint should be allowed to request priority, which can pause competing nonmixable media. N6h.2 retains the sole session/AVAudioEngine worker, original category/mode, N6h.1 active-interruption pause and post-.ended gesture flag. **Only a user's Home UI, mode, Menu Close, or Let's go! tap can attempt activation.** Loading, foreground notifications, hot PCM `play` and `preload` CANNOT steal audio. Higher-priority OS refusal `activation-os-rejected` stays on the **plain retryable Welcome Back** with a clear status rather than creating a terminal gray PCM failure. No automatic replay, Web/HTML fallback, Zoo sound takeover or new session.

**Automated test:** `node scripts/validate_native_pip_takeover_n6h2.js` checks the actual Swift activation policy and VM-executes Home native UI first-tap, seven standalone native game mode bank preflights, interruption while game stays visible, Let's go! with YouTube STILL playing, original PAUSED-video regression and true OS-denial retry. Continue `node scripts/validate_native_pip_interruption_n6h1.js` and all earlier native regressions, then `npm run build`. Final GitHub Actions Node checks and production web build GREEN required; automated tests **cannot compile Xcode/verify actual speaker audio or iOS YouTube arbitration**.

**Historical planned #49 device checklist (the owner subsequently reports successful PiP recovery):** In dedicated `biblozoo-native-audio` worktree pull `experiment/native-ios-audio`; run `node scripts/validate_native_pip_takeover_n6h2.js && npm run build && npx cap sync ios && npx cap open ios`, build separate `BibloZoo Audio Test` bundle `com.andydoane.biblozoo.audiotest` on physical iPhone. Confirm (A) YouTube video PAUSED before returning **still works**; (B) video **STILL PLAYING** when tapping plain Let's go! requests native audio priority and resumes same round/sound if iOS grants it; (C) fresh cold app launch under already-playing PiP **does not auto-steal on load**, but first actual Home UI tap and real game Start/mode tap can reclaim PCM audio and enter gameplay instead of no-op; (D) all seven Snake/Bugs/Food/Splat/Dino/Invaders/Munch plus Home-after-Back, Feeding Bounce and Learn UI regain sound; (E) true OS denial has usable persistent plain retry and safe navigation; held App Switcher unchanged. Capture DEV **Inspect native state** + **Copy Audio Timing Report** before restarting on failure; `prepared`/`accepted` is not speaker proof. Full [N6h.2 real-iPhone acceptance guide](N6H2-PIP-REAL-GESTURE-TAKEOVER.md), give key test steps IN CHAT. **#49 is merged/owner-reported successful; N6i Versey Bird #50 is now the separately gated next draft.**

## N6h.1 — historical #48 pre-merge PiP test plan (superseded by N6h.2 owner results)

**Owner real-iPhone report (2026-11-08):** Verse Munch [#47](https://github.com/andydoane/biblozoo/pull/47) was **merged and normally working**, but while a paused YouTube PiP tile floats over ANY of the seven native migrated games, pressing PiP Play can show a **gray “A native sound stopped. Tap Try Again.”** dialog. Retry never succeeds, and after Back, Home and other games can remain silent. This is a **cross-app audio-focus failure, not a Verse Munch MP3 problem**. The earlier games were tested normally; their PiP coexistence is **NOT** owner-accepted. [Corrective PR #48](https://github.com/andydoane/biblozoo/pull/48) **NOW MERGED; see N6h.2 above for partial owner result, physical iPhone acceptance PENDING**; full [PiP owner checklist](N6H1-YOUTUBE-PIP-INTERRUPTION.md).

**Audio-session contract:** Apple's `.soloAmbient` session does **not mix** with YouTube PiP. Yield while YouTube plays; no new session/category, `.mixWithOthers`, automatic foreground activation, parallel engine, or native Web/HTML fallback. Swift `AVAudioSession.interruptionNotification(.began)` while UIKit remains active now notifies the existing game pause/Welcome Back owner (PiP doesn't always send UIKit inactive), forgets PCM and requires the **next genuine gesture** to reissue bounded `setActive(true)`, even after OS `.ended` or a late/missing `.ended`. `AVAudioSession.isOtherAudioPlaying` blocks attempts without consuming retry budget while YouTube plays. Native DEV state adds `otherAudioPlaying` and `needsGestureAfterInterruption`; `ready/accepted` statuses do not prove audible output.

**Shared JavaScript:** Seven native controllers treat `other-audio-playing`, interruption pending and OS-busy as temporary **same-round pause**, never missing PCM/gray error. Existing **plain Welcome Back** defers with **“Pause the other video's audio, then tap Let's go!”**, never advances the clock or consumes terminal attempts; Back remains available. Once YouTube is paused, child's real **Let's go!** reactivates and preloads the full bank before unfreezing the same round and bonus. Feeding all four native modes uses its pause/Resume overlay; Home UI native pops invalidate on PiP and reprepare from the next actual tap. Browser/PWA/Android, stable `ios-prep` and original installed app unchanged.

**Automated:** `node scripts/validate_native_pip_interruption_n6h1.js` simulates external playback/bank refusal and legitimate recovery in seven native controllers, Home UI pops and shared deferred Welcome Back; checks Swift no auto-activation and exact `.soloAmbient` owner. Run all existing Node regressions and `npm run build`. **Linux CI ≠ Xcode compilation or actual speaker output.**

**Owner real-iPhone after reviewing/merging #48:** in dedicated `biblozoo-native-audio` Mac worktree, pull `experiment/native-ios-audio`, run `node scripts/validate_native_pip_interruption_n6h1.js && npm run build && npx cap sync ios && npx cap open ios`, build **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest` on physical iPhone. Test floating **paused** YouTube PiP over Verse Munch with John 3:16, tap **PiP Play**, expect game freeze into **plain Welcome Back** and YouTube audible, **NO gray fatal popup**; tap Let's go **while PiP still playing** → deferred message/Back escape, no lost food/bonus/score; then **pause PiP**, tap Let's go again → audibly resumed SAME round. Repeat over Home: PiP Play→Pause then real Home UI tap should sound; newly launched game effects audible without restarting app. Regress Verse Invaders bonus, Dino halfway SUN/night, Splat, Food Slice, Snake, Bugs, all Feeding incl Bounce, Learn/verse previews, held/full App Switcher, lock and mute, John 3:16/Psalm 23:4. If anything silent/stuck, **BEFORE restarting** copy DEV **Inspect native state** and **Copy Audio Timing Report** noting PiP playing/paused and any Xcode exception. **Owner alone merges; the later owner acceptance of #49 lifts this historical N6i pause; #50 is now proposed.**

## N6h — Verse Munch native PCM 13-game + 2 shared UI, touchend menu and held App Switcher

**Base:** owner-merged [Verse Invaders #46](https://github.com/andydoane/biblozoo/pull/46) at `33fd3f7a`. **Latest owner's physical iPhone result:** “I put Verse Invaders through its paces and the sounds are working well. Audio is recovering nicely.” **#46 is owner accepted**, NOT open/untested; prior Dino Dash #45, Verse Splat #44, Food Slice #43 were owner-tested. Six of the **12** standalone `verse_games/*/game.js` games accepted = **exactly half**. **[N6h Verse Munch #47](https://github.com/andydoane/biblozoo/pull/47) is the seventh migration PR, OPEN and NOT yet physically owner-accepted**; after real iPhone pass, 7/12 would exceed half.

N6h migrates **only Verse Munch** using 13 unchanged packaged MP3s: 2 word taps, 3 cycling chews, chomp, correct, spew, dizzy, streak, bonus start, bonus result and wrong fruit; plus 2 shared `ui-pop-1/2` = **15 exact fixed native PCM IDs** on same sole Swift `.soloAmbient` AVAudioSession/serialized AVAudioEngine. Original JS alternation, cycling, volumes, food/monster/face/words, speed/20s fruit bonus/scoring/medals unchanged. iOS audio never creates browser AudioContext, silent HTML Audio or Web fallback; Web/PWA/Android keep their prior Web Audio. Real title/Back/Help prepare UI-only; actual difficulty, Game Menu Close, Speed Close, failure Try Again and plain Welcome Back Let's go prepare **all 15** before gameplay/unpaused round, with mode UI pop first. A critical separate iPhone `touchend` **Game Menu Close fallback must obey the same full PCM preflight**, not silently unpause. No routine gray success popup, genuine native error only accessible Try Again/Back. UIKit held App Switcher/full switch/lock freeze PCM and food/bonus clocks, **plain Welcome Back**, no automatic output, real child's Let's go resumes **same round/bonus** after native bank readiness.

**Source verification:** `node scripts/validate_native_verse_munch_n6h.js` checks 13 shipped files, Swift ID allowlist, UI-only/full 15 PCM bank, actual title Start/Back/Help/difficulty/Game Menu/Speed menu/`touchend` fallback/mute/wordTap/chew/bonus sound callbacks and held App Switcher/manual return, without a made-up `volumeScale` global. Run existing N6g Invaders, N6f Dino, N6e Splat, N6d Food Slice, N6c Snake/Bugs, N5 UI, N4 Feeding, N1 native-output isolation, plus `npm run build`; final PR HEAD Actions Node suite and production web build must be GREEN. **Mac Xcode Swift compile and physically audible iPhone remain separate PENDING gates.**

**Owner physical device after review/merge:** isolated `biblozoo-native-audio` Mac worktree pull `experiment/native-ios-audio`; `node scripts/validate_native_verse_munch_n6h.js && npm run build && npx cap sync ios && npx cap open ios`; build separate **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest` on physical iPhone. Test John 3:16/Psalm 23:4 title Start/Back/How to Play/Close; Easy/Medium/Hard, 2 word taps, 3 chews/chomp/correct/wrong fruit/spew/dizzy/streak; 20s fruit bonus start/result, multiplier/medals; Game Menu/Speed Menu/Help and iPhone touchend Close, mute/unmute, no early unpause; UIKit swipe-up-and-HOLD App Switcher/full switch/lock and **plain Welcome Back Let's go** same word/mood/food/bonus seconds; fast Back/mode races; regress owner-passed Invaders audio recovery, Dino midpoint SUN/night, Food Slice/Splat/Snake/Bugs/Feeding Bounce/Learn/previews. On silence/stuck BEFORE restarting DEV **Inspect native state** + **Copy Audio Timing Report**, exact event/verse/mode and JS exception; Swift `prepared`/`accepted` not speaker proof. Full [N6h device checklist](N6H-NATIVE-VERSE-MUNCH.md), provide directly IN CHAT. **Owner alone merges**, every PR updates `docs/PROJECT-HANDOFF.md`.

## N6g — Verse Invaders native-only 13 original + 2 shared UI PCM

**Base:** owner-merged [N6f Dino Dash #45](https://github.com/andydoane/biblozoo/pull/45) `a2c32f34`; **latest owner actual iPhone report:** “I MERGED and tested that PR and it's working great!” Do not leave #45 as open/untested. Earlier Verse Splat #44, Food Slice #43 and Snake #42 were also owner-accepted to their tested extent.

**OPEN [N6g Verse Invaders #46](https://github.com/andydoane/biblozoo/pull/46), owner Xcode/iPhone pending:** 13 unique original bundled Invaders game MP3 effects (rocket/correct/wrong/abduction/streak/bonus start/5 random bonus pops/bonus penalty/bonus reveal) plus 2 shared native UI pops = **15 unique fixed PCM IDs** on sole Swift `.soloAmbient` AVAudioSession / serialized AVAudioEngine worker. The original `streak4/8/12/16` and `bonusMultiplierUp` all share one shipped streak MP3: **deduplicate native preloads** but preserve independent JS event names and original volumes. Title/Back/How to Play/Close prepares two UI samples only; genuine mode selection/menu Close/Try Again/plain Welcome Back Let's go! prepares full bank before starting/resuming. Native iOS has **no Web/HTML audio/silent prime fallback**, no new category/engine; Web/PWA/Android remain original. No routine gray success modal; real failure only accessible Try Again/Back. Preserve original tutorial, rocket/alien mechanics, bonus multiplier/score/medals, mute, UIKit held App Switcher and **plain Welcome Back manual same-round return** (no auto audio or Zoo Escape). `accepted`/`prepared` statuses never prove physical speaker hearing.

**Automated:** `node scripts/validate_native_verse_invaders_n6g.js` checks exact Swift resource allowlist and 13 on-disk MP3s, native 15-unique-ID preflight and one streak preload, UI pop before effects, failure and stale/inactive races, and executes actual title Start/Back/Help/Close, difficulty, Game Menu/mute, bonus-volume and Let's go callbacks without a stray `volumeScale`. Run old N6f Dino, N6e Verse Splat, N6d Food Slice, Snake, Bugs, Feeding/UI and native-output isolation regressions plus `npm run build`; final GitHub Actions Node and web must be green. **Mac Xcode compile and physically heard iPhone audio are SEPARATE pending acceptance gates.**

**Owner iPhone after review/merge:** in isolated Mac `biblozoo-native-audio` worktree pull `experiment/native-ios-audio`; run `node scripts/validate_native_verse_invaders_n6g.js && npm run build && npx cap sync ios && npx cap open ios`, build separate **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest`. John 3:16/Psalm 23:4: title/Back/How to Play/Close, Easy/Medium/Hard, rocket/correct/wrong/abduction, streak 4/8/12/16, 5 randomized bonus pops, bonus start/multiplier/penalty/reveal, score/medals; Menu/Help/mute, held/full App Switcher and lock → **plain Welcome Back**, actual Let's go same aliens/score/bonus time, stale mode/Back no ghost start. Regress owner-passed Dino Dash halfway feeding SUN/night checkpoint, Verse Splat/Food Slice/Bugs/Snake/Feeding Bounce/Learn/previews. If silent/stuck BEFORE restart DEV **Inspect native state** + **Copy Audio Timing Report**. Full [N6g owner test](N6G-NATIVE-VERSE-INVADERS.md) also needs steps **directly in chat**, not just docs. Owner alone merges, handoff updated every PR and owner device findings reconciled next PR.

## N6f — Dino Dash native 8+2 PCM, halfway checkpoint sun gesture

**Integration base:** owner-merged [Verse Splat #44](https://github.com/andydoane/biblozoo/pull/44) at `c89b5008`; **new owner iPhone report after #44: “That PR worked great!”** This closes N6e's previously pending device gate; do not describe #44 as open/untested. Earlier #43 Food Slice and #42 Snake fixes were likewise owner-tested.

**N6f [Dino Dash PR #45](https://github.com/andydoane/biblozoo/pull/45) OPEN, Xcode/device PENDING:** Map original 8 shipped Dino Dash MP3 effects (first/double jump, collision, correct, wrong, fall, finish, streak) + 2 shared native UI pops to the same sole Swift `.soloAmbient` AVAudioSession and serialized AVAudioEngine PCM worker. Real child title/Back/Help prepares UI-only, real difficulty/Game Menu Close/Speed Menu Close/Retry/Let's go prepares full **10-ID** PCM before unmuted game/resume. Successful prep quiet; true PCM failure only accessible Try Again/Back. No iOS Web Audio, HTML silent prime/clone or fallback, no new engine/category; browser/PWA/Android behavior unchanged. Original Dino mechanics, jump responsiveness, speed, menus, score, bonus and diagnostics preserved. **Special half-way feeding checkpoint reload:** after WebView reload, only actual child's **SUN tap** starts full native PCM preflight concurrently with existing orbit animation; resume saved night checkpoint only on readiness, no activation on reload or timeout. UIKit inactive held App Switcher/full switch/lock freezes original welcomeClock/animations and PCM, shows plain Welcome Back and manual Let's go same round (no auto play).

**CI/test:** `node scripts/validate_native_dino_dash_n6f.js` checks 8 bundled assets, exact Swift fixed IDs, native UI vs full PCM bank, mode pop ordering, no Web fallback, and executes **actual** title Start/Back/Help/Close, difficulty, menu, speed, jump/double jump, held inactive, manual Let's go, and halfway SUN tap source functions in VM without out-of-scope `volumeScale`. Run original Verse Splat/Food Slice/Snake/Bugs/Feeding/UI native regressions and `npm run build`. Verify **final PR HEAD GitHub Actions** Node suite + production web build green. **CI != Mac Xcode Swift build != physically audible iPhone proof.**

**Owner physical iPhone acceptance after review/merge:** On separate Mac `biblozoo-native-audio` worktree pull `experiment/native-ios-audio`, run `node scripts/validate_native_dino_dash_n6f.js && npm run build && npx cap sync ios && npx cap open ios`, build **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest` on real iPhone. John 3:16/Psalm 23:4: Start/Back/Help/Close/difficulty pops, game first/double jump, correct/wrong/streak/collision/fall, bonus finish, speed menu/mute/Close, rapid Back and no routine gray success modal. **Play to HALF-WAY FEED, allow WebView reload, tap SUN, watch moon transition and confirm SAME saved night round with audible PCM/score/progress.** Test held App Switcher just after sun tap; no ghost round, failure-only retry. During movement test held/full task switch and lock → **plain Welcome Back**, manual Let's go resumes same round without audio/physics auto play or time catch-up. Regress Verse Splat (owner just accepted), Food Slice, Bugs, Snake, all Feeding incl Bounce, Learn and previews. If silence/stuck, BEFORE restart copy DEV **Inspect native state** + **Copy Audio Timing Report** and Xcode JS exception; native `accepted`/`prepared` not acoustic proof. Full [N6f owner device guide](N6F-NATIVE-DINO-DASH.md). Owner alone merges; every PR updates living handoff.

## N6e — Verse Splat native 13-game + 2-UI PCM owner device gate

**Base:** owner-merged N6d [Food Slice #43](https://github.com/andydoane/biblozoo/pull/43) at `90833629`; latest **actual post-merge iPhone report**: owner “went thorugh all the tests and the PR is working great.” **Do not mark N6d untested/open.** Prior N6c.2 Snake [#42](https://github.com/andydoane/biblozoo/pull/42) owner-tested worked after the `volumeScale` Start/Back JavaScript fix.

**N6e [Verse Splat #44](https://github.com/andydoane/biblozoo/pull/44) is OPEN and NOT yet physical iPhone accepted.** Convert 13 original packaged MP3 game effects (5 paint pops, 3 correct, wrong, streak, paint score, start and positive) plus two shared native UI pops to **the existing one Swift `.soloAmbient` AVAudioSession/serialized AVAudioEngine PCM worker**. Native iOS must not create a browser AudioContext, use an HTML Audio clone or fall back to Web; browser/PWA/Android keep their existing Web/HTML output. Original sound selections/cooldowns/volumes and Verse Splat paint/tutorial/bonus clocks/coverage/prizes/medals unchanged. Real title Help/Back gesture UI-only preflight; actual mode selection and Game Menu Close/Retry prepare all **15 native PCM IDs before start/resume**, UI pop before game bank; normal preparation quiet, failure-only accessible Try Again/Back. UIKit held App Switcher/lock/full switch pauses PCM/gameplay; **plain Welcome Back** and real Let's go manual full-bank prep resumes the same paint/bonus state, no automatic foreground sound or Zoo surprise.

**Regression:** `node scripts/validate_native_verse_splat_n6e.js` checks original resource files, Swift exact PCM allowlist, original random/cooldown routing, real Start/Back/Help/mode/menu/bonus/mute button callbacks with no foreign `volumeScale` global, stale preflight/held App Switcher, and no native Web/HTML audio fallback. Also run N6d Food Slice, N6c.2 Snake, N6c Bugs, N5 UI, N4 Feeding and N1 isolation tests + `npm run build`. **Final PR HEAD Actions Node suite/web build, Mac Xcode Swift compile and owner physically heard sound are separate acceptance gates.**

**After owner review/merge:** On separate `biblozoo-native-audio` Mac worktree pull `experiment/native-ios-audio`; `node scripts/validate_native_verse_splat_n6e.js && npm run build && npx cap sync ios && npx cap open ios`. Build the distinct **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest` on a physical iPhone. Test John 3:16/Psalm 23:4 title Start/Back/How to Play+Close, each difficulty pop, paint pop/correct/wrong/streak/soft spawn/score/start/positive/bonus, menu/Help/Close, mute, bonus clock and paint coverage, held/full App Switcher and lock → **plain Welcome Back**, manual Let's go same round, quick Back/stale taps, failure-only retry. Regress Food Slice owner-passed sounds/bonus/return, Bugs, Snake, four Feeding modes incl Bounce, Learn and previews. On any failure BEFORE restarting use DEV **Inspect native state** and **Copy Audio Timing Report**; `prepared`/`accepted` not speaker proof. Full owner test: [N6e guide](N6E-NATIVE-VERSE-SPLAT.md). **Owner alone merges.**

## N6d — Food Slice native fixed PCM effects and real-button iPhone gate

**Current experimental native PR [#43](https://github.com/andydoane/biblozoo/pull/43), not yet owner iPhone accepted.** The previous Snake fix [#42](https://github.com/andydoane/biblozoo/pull/42) merged `cd913f52`; **the owner retested #42 on iPhone and reported “That worked.”** (The earlier #41 release had broken Snake title Start/Back with two out-of-scope `volumeScale` references, which #42 corrected.) Bible Bugs title/mode pops also seemed repaired per the owner's previous report.

N6d migrates only **Food Slice** iOS native audio to 10 bundled predecoded MP3 PCM effects (5 slice, 3 swoosh, wrong, bomb) plus 2 existing native UI pops. Same **single Swift `.soloAmbient` AVAudioSession and serial `AVAudioEngine`**; strict real-gesture title UI-only preparation and difficulty/menu-close/full-bank preparation before start/resume, no routine gray success dialog, only genuine native failure → accessible Try Again/Back. No Web/HTML audio fallback on native iOS, no dynamic paths, no unprepared game sound, no automatic foreground output; Web/PWA/Android, stable `ios-prep`, original iOS app, and game progress/score intact. On UIKit `.inactive` (including held App Switcher) game physics and PCM pause; plain Welcome Back and **Let's go!** re-prepare native sounds and resume the **same** round.

**Regression:** `node scripts/validate_native_food_slice_n6d.js` validates original 10 packaged files, Swift exact allowlist, original randomized event routing and volumes, UI clip readiness distinct from full bank, and **invokes actual Food Slice Start/Back/Help/Close/difficulty/Menu/mute/App Switcher/Welcome Back callbacks in a VM without a global `volumeScale`**. Run existing N6c.2 Snake, N6c Bugs, N5 UI, N4 Feeding and N1 isolation suites and `npm run build`. Verify **final PR HEAD** GitHub Actions Node regressions and production web build both green. Source checks are NOT Swift Xcode compilation or physical sound audibility.

**Owner physical iPhone acceptance:** In separate `biblozoo-native-audio` Mac worktree, after owner review/merge pull `experiment/native-ios-audio`, run `node scripts/validate_native_food_slice_n6d.js && npm run build && npx cap sync ios && npx cap open ios`; build **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest` in Xcode. On John 3:16 and Psalm 23:4, test Food Slice title Start/Back, How to Play/Close, Easy/Medium/Hard difficulty, native pops before the game, slice 1–5 and swoosh 1–3, wrong and Hard bomb, bonus/score/medals, menu/Help/mute, repeated held/full App Switcher and lock/unlock, **plain Welcome Back** and same fruit/timer/score after deliberate Let's go. Regress Bible Bugs, Snake, Feeding including Bounce, Learn and verse previews. If silent or stuck capture DEV **Inspect native state** + **Copy Audio Timing Report** before restarting; `accepted`/`prepared` are scheduling-only. Complete checklist [N6d guide](N6D-NATIVE-FOOD-SLICE.md). **Owner alone merges and supplies acoustic acceptance.**

## N6c.2 — Scripture Snake title Start/Back JavaScript regression and native Help pops

**Post-merge physical iPhone finding from N6c.1 [#41](https://github.com/andydoane/biblozoo/pull/41):** Bible Bugs' native title/mode pops appeared fixed, but **Scripture Snake title Start and Back did not respond**, and the **How to Play** button opened without a pop. The Xcode JavaScript exception is **`ReferenceError: Can't find variable: volumeScale` at `verse_games/verse_snake/game.js:896:52`** on Start. The two undefined uses are in Snake's `unlockAndTap()` and `primeSnakeAudioAndContinue()`, not the legitimate parameter in `playGameSound(key, volumeScale = 1)`. The unrelated sandbox/WebContent/AX warnings are not evidence of the root cause. Native `prepared:true` / `accepted:true` signals prove bridge dispatch only, not speaker output.

**N6c.2 corrective [PR #42](https://github.com/andydoane/biblozoo/pull/42):** Use the already-existing bounded `SOUND_VOLUMES.uiTap1/2` in both Snake UI entrypoints, rather than a nonexistent shared `volumeScale`. Wire native-only How to Play and Help Close pop listeners **on the existing shell buttons** without replacing their working navigation. No Swift code or `.soloAmbient` session change, no Bible Bugs changes, no game physics/progress/score changes, and no native Web/HTML audio fallback; browser/PWA/Android and stable `ios-prep` unchanged. The prior N6c.1 native two-pop PCM preflight, whole-bank game readiness, UIKit inactive/plain Welcome Back and failure-only Try Again remain mandatory.

**Regression:** `node scripts/validate_native_snake_title_ui_n6c2.js` executes **actual Snake Start/Back/Help/Help Close/difficulty/resume callbacks** in a VM without any global `volumeScale`, checking no JS exception, responsive navigation, expected native UI volume, mute and original browser path. Run this alongside [N6c.1 test](../scripts/validate_native_standalone_ui_pops_n6c1.js), N6b/B.1 Snake, N6c Bugs, N1 native-only output and full Node regressions / `npm run build` in experiment GitHub Actions. Source checks and Linux web build do **not** compile Swift or prove acoustic output.

**Owner iPhone acceptance:** After owner review/merge on isolated `experiment/native-ios-audio` in dedicated `biblozoo-native-audio` Mac worktree, build/sync/open Xcode **BibloZoo Audio Test** (`npm run build && npx cap sync ios && npx cap open ios`). Verify Scripture Snake title **Start navigates**, **Back returns/exits**, How to Play/Close still open/close **with pops**, difficulty Easy/Medium/Hard works with genuine native pops, Game Menu/Speed Close resumes the same round, John 3:16 and Psalm 23:4 gameplay sounds/score remain correct, mute, fast Back, held/full App Switcher or screen-lock return shows plain Welcome Back with explicit Let's go and no auto audio/time catch-up. **Bible Bugs title/mode/end pop regression** plus Feeding four modes, Learn, previews. On any failure collect DEV Inspect native state + Copy Audio Timing Report **before restarting**. Owner hearing/Xcode **PENDING** until tested. Full chat-ready steps [N6c.2 guide](N6C2-SNAKE-TITLE-UI-REGRESSION.md); handoff [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md). Owner alone merges.

## N6c.1 — Native standalone title/difficulty UI pops (owner iPhone gate pending)

**Verified starting point:** owner-merged [N6c Bible Bugs #39](https://github.com/andydoane/biblozoo/pull/39) at `67d2a107`, followed by owner-merged handoff correction [#40](https://github.com/andydoane/biblozoo/pull/40) at `ac4f7aa`. Owner reports Bible Bugs gameplay worked as expected **except title and difficulty buttons were silent**; its end screen popped. Scripture Snake shares title/mode silence. N6c final Node regression/web build at `7cea2d43` was green ([Actions #42442109251](https://github.com/andydoane/biblozoo/actions/runs/42442109251)); that is not iPhone acoustic proof.

**Native-only gate:** N6c.1 uses the same sole `.soloAmbient` Swift session/AVAudioEngine worker and the existing fixed `ui-pop-1/2` PCM clips. An actual title/Back tap activates the existing native UI purpose and prepares only two UI clips, not gameplay; a real difficulty/menu Close tap invokes the existing game activation synchronously, prepares UI clips first and schedules the UI pop **before** decoding the other Snake/Bugs effects, then waits for the *entire* game bank to be ready before starting/resuming. No generated sound, new engine, native HTML/Web fallback or gray success popup. Bounded first cold tap beyond 350ms is deliberately not played late (N9 remains).

**Regression and owner acceptance:** `node scripts/validate_native_standalone_ui_pops_n6c1.js` plus the historical Snake, Bible Bugs, N1 isolation and full Node/web build checks. Test John 3:16 title/start, mode Easy and Back in **both** games, second mode and Psalm 23:4, in-game menu/Close and Snake speed Close, active game sounds and Bugs end pop, mute/unmute, rapid Back/duplicate mode, UIKit held App Switcher and full switch/Let's go same round without auto foreground audio or score catch-up. Regress Feeding/Preview/Learn. Build `BibloZoo Audio Test` in separate Mac worktree with `npm run build && npx cap sync ios && npx cap open ios`. Final-head CI, Swift Xcode and owner-heard iPhone sounds are three distinct gates; **owner test pending**. On silence use DEV Inspect native state and Copy Audio Timing Report **before restarting**. Full test checklist: [N6c.1 guide](N6C1-NATIVE-STANDALONE-UI-POPS.md). Stable `ios-prep`, original app and browser/PWA/Android unchanged; owner alone merges.

## 1. Working with GitHub pull requests

1. Before work, check current `ios-prep` HEAD, latest commits, open PRs and owner instructions. Local uncommitted changes are **not** visible to GitHub; have the owner push relevant work first when necessary.
2. Branch from latest `ios-prep`, **not `main`**. Make focused edits with tests and an update to [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) **in the same PR**. Update this guide/audio guide if contracts change.
3. Open a PR with **base `ios-prep`** for ordinary development, or **base `experiment/native-ios-audio`** for the isolated native-audio experiment. Draft while incomplete. Include risk, changed behavior, exact validators run, their results, and what needs the iPhone.
4. Inspect the PR diff and available Actions status on the **final commit**. If checks don't exist, don't imply they ran. A docs-only PR need not alter runtime code or bump an app version.
5. **The owner reviews and merges**; the assistant does not merge or push directly to `ios-prep` unless separately instructed.
6. In GitHub Desktop: switch to `ios-prep` → **Fetch Origin / Pull Origin**. Build, sync, run on iPhone, and report failures; address those in a focused follow-up PR.

For especially risky changes, the owner may instead check out/test the PR branch *before* merging. That is optional, but enables pre-merge iPhone acceptance.

## 2. Local setup and production build

From the repository root on macOS:

```sh
git status --short
git branch --show-current         # should be ios-prep after the merge and pull
npm ci                             # initial setup or lockfile/dependency changes
npm run build                      # scripts/build.js regenerates ignored dist/
npx cap sync ios                   # copies dist/ and syncs Capacitor project
npx cap open ios                   # then build/run App target in Xcode
```

On `ios-prep`, Capacitor config is `capacitor.config.json`, application ID `com.andydoane.biblozoo`, web directory `dist`. The isolated native-audio experiment instead uses `com.andydoane.biblozoo.audiotest` after the experimental identity PR is merged. A successful `npm run build` doesn't prove native playback or layout is correct. The native iOS bundle uses copied assets; the web/PWA separately uses `service-worker.js` caching. Check both if offline behavior changes.

Do not commit `dist/` or `node_modules/` (both ignored). After changing runtime assets, regenerate `dist/` **before** syncing; avoid interpreting stale bundled files as a code regression.

### macOS worktree: 21 CRLF-only tracked files (November 2026)

The repository already declares `*.js`, `*.css`, `*.html`, `*.json`, `*.md` and `*.txt` as `text eol=lf` in `.gitattributes`. However, the `ios-prep` base at `f4a80c35` still contained 20 JSON files and `verse_playground/ghost_writer/game.css` as CRLF *committed blobs*. A fresh macOS worktree therefore reported 21 modified files immediately. `git ls-files --eol -- <path>` showed `i/crlf w/crlf attr/text eol=lf` even though `git --no-pager diff --ignore-space-at-eol --stat 2>/dev/null` produced no meaningful diff. This is not a source-data change, and changing `core.autocrlf` or repeatedly clicking Discard does not fix the inconsistent index blobs.

The focused `fix/normalize-lf-tracked-text` PR changes only CRLF to LF and adds a Node check of the **committed blob bytes** as well as the checked-out file bytes. After the owner merges it into `ios-prep`, an existing `experiment/native-ios-audio` branch must also be advanced; **Fetch Origin by itself does not move the local branch**. For the specific freshly created experiment branch, only if there are no valuable local edits or separate commits, verify the expected line-ending-only diff, then fetch the merged baseline and run `git reset --hard origin/ios-prep` **inside the experimental worktree**, check `git status --short` and `git ls-files --eol`, and push the updated experiment branch. That reset deliberately discards *all* uncommitted tracked-file changes and resets the branch pointer: never run it if the experiment already contains independent work. Prefer a normal merge or a separate PR to sync a branch containing work.

### Isolated native-audio experiment — Mac/Xcode smoke check

The `experiment/native-ios-audio` branch has a dedicated macOS worktree (`biblozoo-native-audio`). Its **test app identity must be different from the existing installed BibloZoo app**:

| Property | Stable `ios-prep` | Native-audio experiment |
| --- | --- | --- |
| App label | BibloZoo | BibloZoo Audio Test |
| Capacitor `appId` | `com.andydoane.biblozoo` | `com.andydoane.biblozoo.audiotest` |
| Xcode Debug + Release `PRODUCT_BUNDLE_IDENTIFIER` | `com.andydoane.biblozoo` | `com.andydoane.biblozoo.audiotest` |
| Info.plist `CFBundleDisplayName` | BibloZoo | BibloZoo Audio Test |

After the experiment-specific setup PR is **merged into `experiment/native-ios-audio`**, switch to that worktree in GitHub Desktop, Fetch/Pull Origin, and in **that folder** use:

```sh
git branch --show-current            # experiment/native-ios-audio
git status --short                   # should be clean before syncing
npm ci                               # if new worktree dependencies not yet installed
node scripts/validate_native_audio_test_identity.js
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode, select the **App** target, open **Signing & Capabilities**, confirm the **Bundle Identifier** ends in `.audiotest`, select the owner's valid Apple development **Team**, and enable **Automatically manage signing** as needed. The existing project's team setting has deliberately *not* been changed in source. Select the physical iPhone as the run destination, then Build/Run and confirm **BibloZoo** and **BibloZoo Audio Test** appear as separate apps. Do **not** run/install a test build if Xcode still shows `com.andydoane.biblozoo`; that identifier could replace the existing app. Export a family backup first, and don't assume existing profiles/progress carry over to the separate bundle ID. The test icon currently shares artwork with the normal app—read the home-screen labels.

The setup PR changes **only identity**, not native playback. Check a normal verse/game and ordinary sound, plus basic foreground/background behavior before adding experimental audio code. No native app compile or on-device signing can be validated by web/Node CI.

The workflow file is extended **only on the experimental branch** to watch PRs/pushes to `experiment/native-ios-audio` and run the identity validator there, while keeping `ios-prep` compatible if the workflow is ever integrated. GitHub **did start a PR Actions run on the initial identity setup PR (#8)** even though the pre-merge experiment branch lacked the updated trigger; check the **final PR commit's actual Checks tab** rather than assuming checks are absent or have passed. After owner merge, also verify the experimental branch's post-merge push checks and subsequent PR checks. None of these Node/web jobs compiles or signs native iOS code.

### N6c — Bible Bugs fixed native sounds (PR #39): quiet startup, actual events, held App Switcher

**Verified Linux source gate:** the full Node regression suite (including 14 Bible Bugs fixed assets, real game source VM event/volume, failure-retry, stopped/stale PCM race, N6b.1 quiet Snake, Learn, Feeding and Zoo) plus production web build **GREEN at `22a2ec99`** ([Actions #42442016620](https://github.com/andydoane/biblozoo/actions/runs/42442016620)). Recheck final docs-only HEAD. This is NOT an Xcode Swift build or physically heard iPhone speaker output.

**Owner-merged baseline:** [N6b.1 #38](https://github.com/andydoane/biblozoo/pull/38) `6f2ab22a` on `experiment/native-ios-audio`: owner says **everything worked well**, after earlier repeated Snake App Switcher recoveries and requested removal of the unwanted routine gray sound-preparation overlay. This validates the owner-tested Snake UI and switch recovery, not exact sound latency or each individual effect. N6a Detail/Flashcards, N5b.3 full John Learn/Psalm switch, DEV narrator and N4/Feeding were previously accepted.

**N6c #39 scope:** **Bible Bugs only** (frog catches word bugs) in separate iOS **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest`. The original `game.js` sound triggers stay: tongue, five randomized bug-pop effects, correct/incorrect, streak, bonus-start, bonus-end, stink-bug penalty, existing two UI pops. Swift adds twelve allowlisted `bugs-` keys to the **existing** `pcmEffectIDs` and file mapping under `public/verse_games/bible_bugs/bible_bugs_sounds`. Same one `.soloAmbient` native audio-session owner and serial prewarmed AVAudioEngine worker as Feeding/Snake. Real Choose Difficulty, native Retry, menu Close or explicit Welcome Back Let's go **synchronously activates Swift** and awaits all 14 PCM sounds before first/same-game next step. **No routine gray success popup**. Genuine refused native session/sample/play alone shows **Try Again/Back**, without Web/HTML fallback or Zoo Break, never pretends a Swift `prepared` response proves speaker audibility. Original Web/PWA/Android sounds still use original Web Audio. Gameplay word/snake-like physics, scoring/streak/bonus/medals/rewards untouched.

**App Switcher:** UIKit `.inactive` swipe-up-and-**HOLD** can happen while WebKit thumbnail is visible; native Bible Bugs owner stops effects and pauses **frog/bug physics/game clock** via existing *plain* Welcome Back. On return there is no automatic sound; child taps Let's go to warm the full bank, then resumes the SAME bug positions/timer without catch-up or duplicate credits. Full task switch and second switch the same. Mute/menu/help/touch fallback/exit stop; Close rewarm on genuine gesture. Duplicate difficulty/Back during preflight cancels generation to forbid stale delayed start, without a visible loading overlay. N7 mic/DSP, N8 independent Zoo, N9 first UI-pop reliability, other 10 standalone games, Playground/Daily/Read My Verse excluded.

```sh
node scripts/validate_native_bible_bugs_n6c.js
node scripts/validate_native_snake_quiet_preflight_n6b1.js
node scripts/validate_native_snake_effects_n6b.js
node scripts/validate_native_only_ios_output.js
npm run build && npx cap sync ios && npx cap open ios
```

**Owner physical iPhone:** Separate BibloZoo Audio Test; John 3:16 → Bible Bugs Easy; NO routine gray prewarm dialog. Hear real tongue, randomized pops, correct vs incorrect, streak, bonus-start/bonus-end and stink bug effects at real game events, with unchanged score/medal/verse progress. Test Psalm 23:4/another difficulty, menu/How to Play/iOS touch fallback, mute/unmute, Back and failed-asset Retry if it naturally happens. Swipe up and **HOLD** mid-bug fall, then return; check bug movement/sound frozen, **plain Welcome Back**, manual Let's go restores same game without extra popup/Zoo Break. Full task switch and repeat. Regress Snake quiet start/held return, N6a Detail/Flashcards, N5 Learn/DEV and Classic/Melody/Labyrinth/Bounce. On failure **DEV Inspect native state** and **Copy Audio Timing Report BEFORE restarting**; bridge metadata is NOT audible verification. [Full step-by-step owner gate](N6C-NATIVE-BIBLE-BUGS.md) — must also be included **directly in chat**. Linux source Node regressions + production web build, Apple Swift Xcode compile and human iPhone hearing are **three distinct acceptance gates**. Owner alone merges; stable `ios-prep` and original iOS app untouched.

---

### N6b.1 — quiet Scripture Snake normal preflight, error-only Try Again (PR #38)

**Automated source gate:** full Node regressions (N6b.1 real-source VM, N6b Snake PCM, N6a Detail, older Learn, Feeding and Zoo recovery) and production web build **GREEN** at `351a6574` ([GitHub Actions #42438471987](https://github.com/andydoane/biblozoo/actions/runs/42438471987)). Reconfirm final docs-only HEAD; this is **NOT Swift/Xcode compilation or physically audible iPhone output**.

**Owner real iPhone evidence:** N6b [#37](https://github.com/andydoane/biblozoo/pull/37) owner-merged as `c33c15a3`; owner played Scripture Snake repeatedly, including **multiple task switches with successful recovery each time**. Their one new complaint was **light-gray popup screens after difficulty selection and sometimes task return**. These were introduced by N6b as an every-preflight “Getting native game sounds ready…” gate, **not part of original Snake**. The report does not separately establish audibility of every individual effect or precise device latency.

[N6b.1 PR #38](https://github.com/andydoane/biblozoo/pull/38) removes the *routine successful* gray audio-preparation dialog while preserving every important safety gate. On genuine **Choose Difficulty**, menu/speed **Close** and plain **Welcome Back → Let's go!**, Swift activation and the fixed Snake native MP3/UI-pop/orb PCM bank preparation remain mandatory **before gameplay starts/resumes**. During the preparation, the *existing* difficulty screen or paused round stays visible; accessibility `aria-busy` marks the existing app container, but no new visible modal is added. Native **actual failure** (session, packaged clip, PCM worker, in-round play or rare first-frame readiness) still opens the intentional gray **Try Again / Choose Difficulty** dialog. Do not replace it with a silent round or Web/HTML fallback. Because the difficulty buttons are not covered by the former loading modal, N6b.1 ignores rapid duplicate selects and invalidates **Back/title/mode/exit** preflight; late native promises cannot start a wrong screen. UIKit `.inactive` in held App Switcher and WebKit hidden cancel first-run pending preflight silently; normal running game continues to use plain, explicit Welcome Back with no automatic foreground sound. Scoring, physics, sound identity, native session and all earlier game/Feeding/Learn/Web logic unchanged.

**Owner Mac/Xcode gates in isolated Audio Test worktree:**
```sh
node scripts/validate_native_snake_quiet_preflight_n6b1.js
node scripts/validate_native_snake_effects_n6b.js
node scripts/validate_native_verse_previews_n6a.js
node scripts/validate_native_only_ios_output.js
npm run build && npx cap sync ios && npx cap open ios
```

**Physical iPhone:** Launch **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest`. Open Practice Games → Scripture Snake → John 3:16 → Easy: preparation should complete with **no gray loading popup**; Snake starts only when its sounds are ready. Try another difficulty and Psalm 23:4; hear genuine correct/wrong, fruit, orb, boost, bonus effects. Open Game Menu, How to Play and speed menu; Close must quietly rewarm before same round continues, no duplicate dialogs. For App Switcher swipe up and **HOLD** with visible WebKit thumbnail, then return: one **plain Welcome Back** is expected, no automatic effects or motion; tap **Let's go!**, confirm same round/position and **no second gray popup**. Repeat complete task switch several times, mute/unmute and exit. Try rapid double difficulty taps and Back during preflight if the timing permits: no surprise late game launch or wrong-mode score. If audio **actually fails**, gray **Try Again** is intentionally retained, no Web fallback/Zoo Break. Briefly regress N6a Detail/Flashcards preview, N5 Learn instructions/Chunks/Echo/John complete and Psalm switch, DEV narrator, UI pops, Classic/Melody/Labyrinth/Bounce. For any failure capture **DEV Inspect native state + Copy Audio Timing Report before restart**; note what was heard, what dialog appeared and whether game moved. [Complete owner device checklist](N6B1-QUIET-SNAKE-PREFLIGHT.md).

**Acceptance distinctions:** GitHub Linux Node VM/source and production web build ≠ Xcode Swift compile ≠ actual iPhone speaker output. N5a cold/return first UI pop can still drop under the 350ms bound (N9 debt), not a reason to accept missing Snake effects. Owner alone reviews and merges; do not touch stable `ios-prep` or original installed iOS app. Future N6c game, N7 mic/DSP, N8 separate Zoo, N9 reliability.

---

### N6b — Scripture Snake native fixed effects, orb tones, UIKit held-switch and Verse Detail text cleanup (PR #37)

**Verified source gate:** full Node regressions including N6b Snake game/Swift allowlist VM and all older Feeding/peg/melody/Zoo tests, plus production web build, **GREEN at code HEAD `90bde7cb`** ([Actions run #42436500105](https://github.com/andydoane/biblozoo/actions/runs/42436500105)). Recheck final documentation-only HEAD; Linux CI is NOT Xcode Swift compilation or actual iPhone acoustic proof.

**Owner evidence:** [N6a #36](https://github.com/andydoane/biblozoo/pull/36) was merged `0be4612b`; owner reports **all BibloPet Detail and Flashcards preview tests passed**. Earlier N5b.3 spoken instructions/Chunks/Echo (full John 3:16 Learn, Psalm 23:4 interrupted recovery), N5b.2 Learn Listen, N5b.1 DEV and N5a UI/Feeding were owner-tested. Owner notes that N6a introduced new **visible text under BibloPet Detail's Listen to the Verse** (“Reading the verse reference…” / “Playback paused…”) absent in the original app; N6b removes **only that under-button text**, keeping Listen/Stop, correct native ref→verse, manual retry and Flashcards unchanged.

[N6b #37](https://github.com/andydoane/biblozoo/pull/37) is **the first standalone practice-game output migration**, **Scripture Snake only**, in isolated iOS Audio Test `com.andydoane.biblozoo.audiotest`. Original Snake's fixed Web sample map and Web/PWA/Android output remain for nonnative platforms. Native-only game event calls route to Swift `preload/play/stop` in existing sole `.soloAmbient` session/worker, using **seven fixed MP3s** (correct/wrong word, fruit, boost, bonus start, mini snake eat, bonus result), **two existing UI pops** and **six precomputed native triangle PCM orb tones C5–C6**. No Web/HTML fallback or invented paths/note values; no game physics/scoring/medal/rewards logic changes. Synchronous native activation in real **Choose Difficulty / Try Again / menu or speed Close / Welcome Back Let's go!** tap. Before a new/resumed round proceeds, the complete bank must be prewarmed; failure leaves explicit Retry rather than fake silent success. Mute/menu/speed/exit and native UIKit `.inactive` stop/discard effects; iPhone swipe-up-and-**HOLD** pauses game clock even when WebKit thumbnail remains visible. On native return **plain Welcome Back** (no Zoo Escape, no auto effects or motion) requires manual Let's go to rewarm same round, with no timer/physics catch-up. Web/Zoo defaults unchanged for other activities.

```sh
node scripts/validate_native_snake_effects_n6b.js
node scripts/validate_native_verse_previews_n6a.js
node scripts/validate_native_learn_tracks_n5b3.js
node scripts/validate_native_only_ios_output.js
npm run build && npx cap sync ios && npx cap open ios
```

**Owner iPhone steps:** Open separate Audio Test app; verify **NO extra paragraph under BibloPet Detail Listen** (Stop Listening still toggles) and Flashcards preview unchanged. In Practice Games → **Scripture Snake** choose Easy, select difficulty and observe audio preflight (or explicit Retry if unavailable); actually hear correct word/wrong word collisions, fruit pickup, glowing orb pitch, double-tap boost. Complete bonus round hearing bonus-start, mini-snake-eaten, bonus-result, finish full game and verify original medal/score. Repeat a second verse/difficulty. Open Game Menu/Help/speed, mute/unmute, leave/return: no effects under paused menu, after actual Close reprepare and continue original round; no old audio after exit. Swipe up and **HOLD App Switcher** mid-motion while UIKit inactive and WebKit card visible: PCM and **physics/game clock** stop, return reveals plain Welcome Back, no sound/Zoo Break until actual Let's go!; repeat full task switch and muted switch, verify no catch-up or duplicate score. Regress Learn auto/ref/full, instructions/Chunks/Echo, N6a Detail/Flashcards, DEV native narrator, UI pops, Classic/Melody/Labyrinth/Bounce. On any missing or wrong sound, DEV **Inspect native state** and **Copy Audio Timing Report before restart**; note actual event and heard result. New native PCMs are speaker-verified **only by actual physical iPhone**, not by CI, Xcode simulator, Swift software status or source VM. [Detailed complete N6b owner gate](N6B-NATIVE-SCRIPTURE-SNAKE.md).

**Known:** The first UI pop after cold/return can still be silently skipped under bounded prewarm (N9 UX debt). Not an excuse for missing Snake effects after a successful **entire** PCM bank preparation. Recording/mic/DSP N7, independent Zoo surprises N8, other games/Playground/Daily and N9 reliability excluded. Owner alone reviews/merges; stable `ios-prep` and Web/Android unchanged.

---

### N6a — native BibloPet Detail + Flashcards shared Listen preview (PR #36)

**Automated source gate:** complete experiment-branch Node regression checks (including N6a native preview + earlier Learn/Flashcards/Zoo recovery) and production web build **GREEN** for code commit `4c955ac6` ([GitHub Actions #42433403246](https://github.com/andydoane/biblozoo/actions/runs/42433403246)). Reconfirm final documentation HEAD. This is **not Xcode compilation or proof of iPhone speaker output**; owner physical tests still pending.

**Latest owner-reported iPhone baseline:** [N5b.3 #35](https://github.com/andydoane/biblozoo/pull/35) merged `c9810257`; John 3:16 and Psalm 23:4 both worked well with **all short instructions and chunks audible**, the owner completed the entire John 3:16 Learn flow and confirmed Psalm 23:4 switch/interruption recovery. Earlier N5b.2 reference+whole Learn Listen, N5b.1 DEV narration and native UI/Feeding were owner-tested. A first native UI pop after cold start or App Switcher return may still be dropped intentionally by N5a's 350ms prewarm timeout (N9 UX debt). This **does not** excuse silent long verse previews.

[N6a PR #36](https://github.com/andydoane/biblozoo/pull/36) focuses on one existing `app.js` API shared by **BibloPet/Verse Detail** and **Flashcards**. Their `Listen` buttons formerly used `audioEl` (intentionally blocked on native-only iOS). For the experimental `.audiotest` app only, actual button tap synchronously starts the existing N5b.2 native `BibloZooNativeLearnListen` controller and its **published** local reference→whole verse; native current full-verse `ended` resolves the shared Promise true. Native denied/interrupted/cancelled/stop is false and never marks a memory badge, lesson, pet or game complete. Verse Detail has accessible in-place playing/status/retry and **Stop Listening**, Flashcards preserves its original Listen/Stop/retry button and recording ownership. Preview return is **quiet**—another Listen tap starts from reference; this informational preview is not Learn's same-part manual Welcome Back checkpoint. No Zoo Escape or Web/HTML fallback on native iOS. Web/PWA/Android existing HTML preview remains untouched.

```sh
node scripts/validate_native_verse_previews_n6a.js
node scripts/validate_native_learn_tracks_n5b3.js
node scripts/validate_native_learn_listen_n5b2.js
node scripts/validate_native_only_ios_output.js
npm run build && npx cap sync ios && npx cap open ios
```

**Owner physical iPhone gates:** In `BibloZoo Audio Test` (`com.andydoane.biblozoo.audiotest`) choose **John 3:16** in BibloPet Zoo/Verse Detail, tap **Listen to the Verse**, actually **hear** reference then full verse, confirm Stop Listening and status; after complete the normal button returns. Repeat with **Psalm 23:4** to verify the selected source. Test rapid Stop→Listen, Back→new BibloPet, mute/unmute, App Switcher swipe up and **HOLD** mid-reference/mid-verse and full switch: immediate silence, **no automatic return sound/Zoo Break**, new explicit Listen restarts reference. In **Flashcards**, select the same two verses, choose difficulty, tap existing **Listen**, hear both native clips, use **Stop** and retry; only actual full verse end clears busy without falsely reporting an audio failure. Changing Flashcards verse/back stops old preview, no recording/mic, badges, score or verse credit. On failure, Verse Detail shows **Sound isn't ready...** and Flashcards retains **Audio couldn't play...**; no Web fallback. Regress Learn instructions/Chunks/Echo/auto Listen and switch recovery, DEV narrator, native UI pops, Classic/Melody/Labyrinth/Bounce. If silent/wrong track, copy DEV Inspect native state + Audio Timing Report before restart and report which actual words were heard. [Full N6a gate](N6A-NATIVE-VERSE-PREVIEWS.md).

**Independent verification:** GitHub Node/source VM and production web build do not compile Swift or prove an audible iPhone speaker. Xcode resource packaging/compile and owner physically heard speech are separate acceptance. Owner alone reviews/merges N6a; stable `ios-prep`, original iOS and Web/PWA/Android unchanged. Remaining standalone games/Playground/Daily/Read My Verse in N6b+, microphone/recordings/Wacky Replay in N7, independent Zoo surprises N8, N9 first-pop/reliability.

---

### N5b.3 — native Learn instructions, two Chunks passes, Echo; owner-reported unwanted Zoo Break (PR #35)

**Owner's latest November 7 iPhone report:** [N5b.2 #34](https://github.com/andydoane/biblozoo/pull/34) merged `d9c9a4db` and its native Listen reference+verse and task switch worked exactly as expected. **Owner also observed three remaining differences/defects:** a new Tap to Play Verse button instead of stable post-transition narration, silent short Learn instructions, and **unexpected Welcome Back → Let's go! → Zoo Break after entering Chunks**. The latter is **not expected completed behavior**; the old HTML chunk player was blocked by experiment-only native-output isolation, then the old Web-era recovery escalated. N5b.1 DEV narration and N5a UI/Feeding tests previously passed; first post-launch/switch UI pop can still drop under the 350ms prewarm ceiling (N9 debt).

[N5b.3 #35](https://github.com/andydoane/biblozoo/pull/35) fixes this in **isolated** `BibloZoo Audio Test` only. Native Swift accepts only static packaged `instructions_*\`.mp3` keys and published `learn-part-{verseId}-{index}` assets whose index matches per-verse `echoParts`: index 0 reference, 1=a, etc. The existing Learn instruction **Continue** tap primes the native session and allows Listen reference narration to **auto-start when the slide settles** (a visible Tap to Play Verse retry remains if priming fails), without auto sound on App Switcher return. Both Chunks passes and Echo use native request/source-specific `ended`, duration-driven 35% silence and 1.25× child repeat windows. Native audio failure shows **Start** retry, not Zoo Escape; manual Welcome Back recovers the same verse/mode/part and approximate native position on real task switch. Web/PWA/Android historical HTML audio/Zoo owner unchanged. No pet/verse/reward changes, no mic/DSP/session category change.

```sh
node scripts/validate_native_learn_tracks_n5b3.js
node scripts/validate_native_learn_listen_n5b2.js
node scripts/validate_native_learn_narration_n5b1.js
node scripts/validate_native_only_ios_output.js
npm run build && npx cap sync ios && npx cap open ios
```

For physical Xcode iPhone **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`): listen to John 3:16 Listen after original **Read It To Me**; narration should start by itself after the slide on successful primed gesture, reference then verse. Verify short instruction card voice and printed Continue, **two full Chunks passes** with ref+part a–e in order (no Zoo), and **Echo** clips then 1.25× repeat window, only real native completion advances. Repeat Psalm 23:4 a–g, check alternate `echo_start` instruction for intermediate levels. App Switcher **swipe up and HOLD mid-chunk and mid Echo**, full app switch, no automatic sound on return, plain **Welcome Back → Let's go!** resumes same part near native checkpoint; no Zoo Break. Check mute, menu open/close, explicit Start retry after refusal, Back/new verse, stale ghost ended, UI pops, DEV narration, Classic/Melody/Labyrinth/Bounce regressions. If silent, use DEV Inspect native state/Copy Audio Timing Report **before restarting** and say what actual voice was heard. See [full owner iPhone gate](N5B3-NATIVE-LEARN-INSTRUCTIONS-CHUNKS-ECHO.md). Linux source/build checks are not Swift Xcode compilation or human acoustic proof; owner alone reviews/merges.

---

### N5b.2 — child Learn Listen native reference then full verse (PR #34)

**Latest owner pass:** After merging [N5b.1 PR #33](https://github.com/andydoane/biblozoo/pull/33) as `af38f56a`, the owner reported all prescribed on-device John 3:16 DEV narration tests positive, including the position/pause/seek/completion/interruption guide as reported. N5a UI pop + Feeding tests also passed; a silent first UI pop after launch/App Switcher remains a deliberate 350ms prewarm compromise (N9 UX debt), not a diagnosis of playback failure.

[N5b.2 PR #34](https://github.com/andydoane/biblozoo/pull/34) routes **actual child-facing Learn Listen** to the native AVAudioPlayer. The app waits for the child to tap **Tap to Play Verse**, then plays **published-verse reference audio**, followed automatically by **full verse audio** only after the current native reference-ended event. Only the current native full-verse ended event enters Meaning. A stale HTML `audioEl.ended`, another native request ID, UI pop or merely accepted `play()` must never advance. Swift checks the existing bundled `public/verse_data/verse_list.json`, each published verse JSON and `public/verse_audio` filenames; no arbitrary URL/path or Web/HTML fallback. A request ID bound to the source and regularly read native `positionMs` checkpoint allow explicit **Welcome Back → Let's go!** after swipe-up-and-**HOLD** App Switcher or full task switch, without auto playback or wrong-track reset. Mute/Back/menu stop and leave a human-controlled retry. **Chunks/Echo/short instruction voice are not native yet;** Web/PWA/Android original Learn audio stays intact.

```sh
node scripts/validate_native_learn_listen_n5b2.js
node scripts/validate_native_learn_narration_n5b1.js
node scripts/validate_native_ui_audio_n5a.js
node scripts/validate_native_bounce_gameplay_n4c.js
node scripts/validate_native_only_ios_output.js
npm run build && npx cap sync ios && npx cap open ios
```

Xcode-run the separate **BibloZoo Audio Test** `.audiotest` bundle on a physical iPhone. Choose **John 3:16**, enter regular Learn, continue to Listen, tap the native **Tap to Play Verse** button and *actually hear* the reference and full verse in order; Meaning must appear **only after** the full verse. Repeat with another published verse such as **Psalm 23:4** to catch source mixups. Test swipe-up-and-**hold** App Switcher mid-reference, resume only after **Let's go!**, then mid-full-verse and after a full app switch; resume the same track close to its last position and finish only once. Test mute/unmute, menu open/close, Back/new verse, no ghost audio or credited progress. Regress DEV John 3:16 position/seek/pause/ended, native UI pops and all four Feeding modes. Short Learn instruction audio may remain silent because it is outside this PR; its printed text/button must remain usable. If silence or wrong-track completion, DEV **Inspect native state + Copy Audio Timing Report BEFORE restart**, and tell us what actually reached the iPhone speaker. See [full N5b.2 physical guide](N5B2-NATIVE-LEARN-LISTEN.md).

**Independent gates:** source commit `d31b7fd8` Node regression suite + production web build **GREEN** ([Actions #42427849185](https://github.com/andydoane/biblozoo/actions/runs/42427849185)); reconfirm final documentation HEAD. This is NOT a Swift compile; owner Xcode asset/Swift compilation and physical iPhone voice/reference→verse/interruption checkpoint acceptance remain pending. Owner alone merges. N5b.3 subsequently migrates native Chunks/Echo/short instruction playback while protecting exactly the current child verse/progress; no stable `ios-prep`, recording/mic or Zoo surprises in N5b.2.

---

### N5b.1 — native long narration DEV player: John 3:16 (PR #33; Xcode/iPhone pending)

**Latest owner acceptance:** N5a [PR #32](https://github.com/andydoane/biblozoo/pull/32) owner-merged as `a4ed899e`, and the owner followed all N5a iPhone guide steps: UI taps/pops sound as expected and Feeding popup/regression checks were positive. **Most first UI pops after launch or task switch are silent.** N5a intentionally drops an unprepared pop after 350ms rather than playing it late. That tradeoff is expected but remains N9 first-tap UX/reliability debt, not a fully reliable first-tap audio pass.

**[PR #33](https://github.com/andydoane/biblozoo/pull/33) N5b.1:** One fixed `learn-john-3-16` native AVAudioPlayer long-form narration proof, local Xcode-bundled `verse_audio/john_3_16.mp3`, explicit `purpose:"learn"` activation on DEV Play, requestId/foreground protections and `prepareNarration/playNarration/pauseNarration/seekNarration/getNarrationState/stopNarration`. Native `biblozooNarration` ended/invalidated event must be from the current player and no earlier request. No Web/HTML fallback or automatic playback. UIKit inactive, route, interruption and media reset must stop the voice. **Child-facing Learn screens are not yet migrated in this first slice**; no Learn verse/chunk/Echo progress is awarded by the DEV test.

```sh
node scripts/validate_native_learn_narration_n5b1.js
node scripts/validate_native_ui_audio_n5a.js
node scripts/validate_native_bounce_gameplay_n4c.js
node scripts/validate_learn_narration_recovery_gate.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build/run **BibloZoo Audio Test** in Xcode on a real iPhone. In the existing **DEV · Native Audio** panel press **Play John 3:16** and *actually hear the verse*, then **Read position** twice to see advancing time, **Pause** (position stable), **Skip +5s** (without restarting), **Continue** (audio resumes), and let playback finish exactly once with its native completion message. Open the App Switcher with a swipe-up-and-**hold** mid-narration: native output must stop and never restart on foreground until a **new explicit Play**. Repeat a full switch; close DEV while voice is playing and ensure it stops and no ghost `ended` event claims Learn progress. Verify original DEV star/chomp/Melody, UI pops, Feeding all four modes still behave correctly. Ordinary Learn output is not yet switched; don't mark it native-complete. If unexpected silence, **DEV → Inspect native state / Copy Audio Timing Report BEFORE restarting** and report what was heard, whether position advanced, and if Xcode compiled. The timing report is primarily for short samples, not acoustic onset proof of narration.

**Separate checks:** full Node regressions and production web build GREEN on source `871a6073` ([run #42423502132](https://github.com/andydoane/biblozoo/actions/runs/42423502132)); reconfirm after final doc commits. Xcode Swift resource compile and owner real sound/position/seek/pause/completion + interruption remain pending. Owner alone merges. Exact [N5b.1 physical test guide](N5B1-NATIVE-LEARN-NARRATION-DEV.md). Later N5b.2 integrates actual Learn Listen (reference + verse) with published-verse manifest and safe completion; chunk/Echo later.

---

### N5a — app-wide native UI pops + quiet Feeding diagnostic text (PR #32 ready for review; physical iPhone pending)

**N4 final owner evidence:** N4c [PR #31](https://github.com/andydoane/biblozoo/pull/31) was merged as `99130c01` on `experiment/native-ios-audio`. After the merger, the owner reported **all Bounce tests passed**. Earlier owner reports accepted native Classic, actual Melody, Labyrinth and N4a.1 App Switcher inactive/return audio. This is owner-reported device acceptance, not quantified speaker-latency measurements.

**[PR #32](https://github.com/andydoane/biblozoo/pull/32) N5a:** In isolated native-only `BibloZoo Audio Test`, app-wide title/menu/ordinary button tap pops now route through two fixed native IDs `ui-pop-1`/`ui-pop-2`, the existing Swift PCM effect engine and a real gesture `purpose: "ui"` activation and prewarm. No automatic playback on foreground, no Web/HTML fallback in iOS, no new AVAudioSession category, no UI sound if muted. First cold tap may finish after the 350ms ceiling and remain intentionally silent; the next tap may play once prepared. App Switcher inactive/active and blur/visibility cancel stale callbacks. Original Web/PWA/Android tap sounds are not changed. **Learn narration, pet-unlock reward, other games and mic/DSP remain outside N5a.**

The same PR hides the temporary native-only Feeding pilot badges, startup traces and detailed startup copy from visible normal iOS Feeding screens. Actual failed Got It! still preserves **Try Again/Back** and failed Let's go! retains **Try again!/Back**; child-facing status is concise while diagnostic reason remains available via the manually tapped DEV Audio Timing Report.

From the dedicated `biblozoo-native-audio` worktree on PR branch or after owner merge:

```sh
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

Xcode-build **BibloZoo Audio Test** on a physical iPhone; verify separate `.audiotest` bundle. Hear the short alternating UI pops on eligible title/menu/buttons (cold first tap may prewarm silently), then exercise rapid navigation, mute/unmute, swipe-and-**hold** App Switcher without leaving the card, full switch to another app and back: **no delayed/auto foreground sound**, next genuine tap restores pops. Retest Classic/Melody/Labyrinth/Bounce sound, unchanged scoring/serves and same-round Welcome Back/Let's go! with no pilot helper prose in normal native Feeding popups. A denied native sound must never silently fall back to Web. If silent, **DEV → Copy Audio Timing Report BEFORE restarting**, note what you actually heard; Swift scheduled/accepted is not acoustic confirmation. Full [N5a owner protocol](N5A-NATIVE-UI-TAPS.md), [handoff](PROJECT-HANDOFF.md) and [audio recovery](AUDIO-RECOVERY.md).

**Separate gates:** GitHub Actions Node regressions and web build passed on [run #42421152202](https://github.com/andydoane/biblozoo/actions/runs/42421152202) at source `241989c3`; confirm final documentation HEAD re-run. Owner Xcode Swift/resource compilation and *human-heard* iPhone UI pops + four Feeding regression/mute/App Switcher remain pending. Only owner reviews and merges. N5b Learn native verse/chunk/Echo playback comes next, under its own position/completion gate.

---

### N4c — native Bounce wall/paddle/brick cues, star bonus and catches (PR #31 merged; owner reports all tests passed)

**New owner hardware evidence:** N4b [PR #30](https://github.com/andydoane/biblozoo/pull/30) is **owner-merged** into `experiment/native-ios-audio` as `18332f90`; owner tested the N4b iPhone build and reported **“everything is working as intended.”** This is positive physical acceptance for N4b Labyrinth under the test they performed, not a detailed numerical acoustic-latency report. N4a.1 #29 was also physically accepted: swipe-up-and-hold freezes immediately with Welcome Back visible in the thumbnail and sound recovered twice. **After #31's merge, the owner reported all Bounce tests passed; this section preserves the original acceptance protocol as history.**

N4c [PR #31](https://github.com/andydoane/biblozoo/pull/31) is the **final planned N4 Feeding mode audio slice**. In native-only iOS `BibloZoo Audio Test`, Bounce now preloads the same fixed `feed-star`, `feed-chomp`, `feed-peg` assets already used for Classic/Labyrinth **after a real Got It! tap**, before starting the original ball/brick game. Wall, ceiling, paddle and ordinary-brick hit events already call `playPegTone`; they now use Swift's six-note prewarmed sine bank, still observing the original **55ms** sound cooldown and no immediate repeated pitch. Breaking a star brick plays native `feed-star` while spawning normal bonus white balls; catching colored snacks plays native `feed-chomp` and updates existing score. No modifications to 5×4 bricks, three serves, `Launch!`, seven-snack goal, paddle physics/tilt/drag, score, rewards, original Web/PWA/Android or stable `ios-prep`. No Web/HTML fallback on `.audiotest` even if native output refuses.

**Owner after reviewing/merging #31** in the dedicated `biblozoo-native-audio` worktree: Fetch/Pull `experiment/native-ios-audio`, then:

```sh
node scripts/validate_native_bounce_gameplay_n4c.js
node scripts/validate_native_labyrinth_gameplay_n4b.js
node scripts/validate_native_app_switcher_pause_n4a1.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build **BibloZoo Audio Test** in Xcode on the actual iPhone. Node/production web CI cannot compile Swift or hear sound.

1. **Bounce rally:** Choose Bounce Tilt/Drag, tap Got It!, then let the white ball rebound from walls, paddle and bricks. Hear short distinct native **peg notes**, not constant beeping; gray and colored bricks break and release snacks normally. Caught colored snacks should make **chomp** and increment score; a miss should not.
2. **Star bonus and serves:** Hit a star brick; hear the native `feed-star` sound and verify original **extra white balls** appear. Score and seven colored snacks objective unchanged. If the white ball escapes, use original **Launch!** next serve; lives/brick state not reset.
3. **Exact App Switcher gesture:** During an active Bounce rally swipe up **and HOLD**, *without choosing another app*. Expect immediate freeze with **Welcome Back visible in the thumbnail**. Tap the BibloZoo card, then **Let's go!**; the **same white ball, remaining bricks/snacks, lives and score** must continue, with native audio on next collision. No automatic sound on foreground.
4. **Full task switch and cross-mode regression:** Switch fully to YouTube/Facebook and back, explicit Resume, then play Classic, Melody and Labyrinth to confirm their native sound and existing progress/controls remain normal. No Web fallback/HTML audio, mic prompt or Zoo Escape audio-error repair.
5. **If initial/returned audio fails:** Do **not** restart first. Tap DEV **Copy Audio Timing Report**, paste 80 event rows plus last 18 native gesture/preload entries and what was actually heard. Preflight `prepared` or sound `scheduled` are only software measurements.

**Verification gates:** New `scripts/validate_native_bounce_gameplay_n4c.js` tests actual JS Got It! native preflight, strict three-ID Bounce allowlist, 55ms impact/anti-repeat, star/chomp, paused silence, failed-first-tap Try Again and cross-platform isolation. All older N3a–N4b and N4a.1 regression checks and production web build must stay green. **Xcode compile, real audible Bounce rally, star/multiball, next serve and both return gestures need owner iPhone acceptance**. Detailed [N4c owner guide](N4C-NATIVE-BOUNCE-FEEDING.md); see [Audio recovery](AUDIO-RECOVERY.md) and [living handoff](PROJECT-HANDOFF.md).

---

### N4b — native Labyrinth landings/catches and same-round Resume (PR #30 merged; owner physical iPhone accepted)

**Actual owner acceptance of preceding [PR #29](https://github.com/andydoane/biblozoo/pull/29), merged `ee7cbae6`:** The iOS App Switcher **swipe-up-and-hold** issue is fixed on physical iPhone: the moment the user swipes up, the game **pauses** and **Welcome Back is already visible in its thumbnail**. The owner reports native audio **recovered as expected on both test returns**. Previous Melody live catches and Classic ordinary/full-task-switch audio were also owner accepted. This is **not** a N4b Labyrinth hearing pass. The exact gesture was never confirmed on older stable `ios-prep` and this PR leaves that branch untouched.

**N4b [PR #30](https://github.com/andydoane/biblozoo/pull/30)** adds Labyrinth as the next N4 native-only Feeding mode. The **existing** platform impact uses `playPegTone`, which now sends Classic's six prewarmed fixed `feed-peg` sine notes in Labyrinth too; both the game-level **135ms per-ball hard-impact gate** and **55ms peg-tone cooldown**, anti-repeat and volume remain. **Chomp** for caught snacks and star bonuses reuse already-native `feed-chomp`/`feed-star`. Got It! prepares exactly those three fixed native IDs, and refuses to start a known silent round on failure (Try Again/Back). Existing mode-specific Melody retains only `feed-melody`, Classic remains separate, **Bounce still unmigrated**. On App Switcher inactive or full background, the activity-owned pause and explicit Let's go! preflight keep Labyrinth score/ball positions/time, without auto-play or Web/HTML fallback. Web/PWA/Android and original stable app unchanged.

**After owner review/merge**, in the separate `biblozoo-native-audio` worktree Fetch/Pull `experiment/native-ios-audio` and:

```sh
node scripts/validate_native_labyrinth_gameplay_n4b.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_melody_gameplay_n4a.js
node scripts/validate_native_app_switcher_pause_n4a1.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build `BibloZoo Audio Test` on physical iPhone (Node/production web CI cannot compile Swift or hear native output).

1. **Labyrinth first tap:** Choose Labyrinth Tilt/Drag; Got It! must prepare native tones. On **actual hard platform landings**, short pleasant peg tones should sound. Resting/sliding contacts must not chirp continuously. Catches should sound chomp; bonuses if they occur use star. Same moving platforms/gaps, ball speeds, snack/pet physics, score, reward logic, feedback and Back.
2. **iPhone App Switcher cards:** Swipe UP and HOLD mid-Labyrinth. Observe frozen balls, **Welcome Back visible in thumbnail** without selecting another app. Tap own BibloZoo card and then **Let's go!**. The **same** Labyrinth score, positions and clock should continue with native impact/chomp audio; never auto-play on return. Also verify full switch to YouTube/Facebook and Back.
3. **Classic/Melody regression:** Classic still hears pleasant pegs/star/chomp and holds scores across the switcher. Melody still hears actual caught notes and holds tune/Caught % across both gestures. Bounce still silent for intentionally-unmigrated native effects, never Web/HTML fallback.
4. **Failure diagnosis:** Failed native preflight leaves Instructions and **Try Again**, not a knowingly silent round. If the first run, landing, or return is silent, tap DEV → **Copy Audio Timing Report BEFORE restarting**; paste 80 event rows + 18 preflight outcomes, and state what the speaker actually did. `scheduled` or 1–3ms native dispatch is software evidence, not proof of audibility.

**Gates:** VM/source tests for N4b and prior N4a.1; final GitHub Node regression/production web build; **separate owner Xcode Swift compile + human-heard Labyrinth impacts/catches and App Switcher recovery**. N4c Bounce only after Labyrinth device gate. Detailed [N4b owner protocol](N4B-NATIVE-LABYRINTH-FEEDING.md), [Audio recovery](AUDIO-RECOVERY.md), [living handoff](PROJECT-HANDOFF.md).

---

### N4a.1 — stop Feeding in the iPhone App Switcher (PR #29 merged; owner App Switcher pause and two audio recoveries passed)

**Owner's newest physical iPhone finding after owner-merged [N4a #28](https://github.com/andydoane/biblozoo/pull/28), merge `436c3c26`:** Actual Melody gameplay sound **worked as intended**, and a **full task switch into another app and back** recovered sound with the existing **Let's go!** button. Classic also worked after that full app switch. However, **swiping up and holding** to view the iOS **App Switcher cards**, **without opening another app**, seems to allow **both Classic and Melody** to continue running while native sound is stopped. Immediately tapping the *same BibloZoo card* does **not** display Welcome Back, and the continuing round is silent with no obvious recovery. This is a different gesture from the previously passing full background-switch path. Owner did **not** perform this exact gesture on stable `ios-prep`, whose JavaScript source also listens for `visibilitychange/pagehide` only; **stable physical behavior is unknown**. Do not infer a Melody-only regression or definite stable bug.

**[PR #29](https://github.com/andydoane/biblozoo/pull/29) N4a.1**, now owner-merged and iPhone-tested, is an experiment-only **inactive-vs-background lifecycle fix**. Existing Swift `UIApplication.willResignActiveNotification` already invalidates native voices when the switcher opens; now Swift also emits a fixed `biblozooAppLifecycle` state-only plugin event on inactive and resumed-active (the latter catches delayed WebKit delivery). **Native-only Classic and Melody** Feeding runtimes subscribe, call their *existing* `pauseFeedingGame` for either event, cancel current rAF, preserve original score/song/balls and show Welcome Back; no automatic reactivation. `window.blur/focus` supplement the native signal for the card case where `document.hidden=false`. A second inactivity while a Resume preflight is pending invalidates its gesture generation, so only a **new real tap** may re-prepare. The plugin callback and focus/blur handlers are removed on game exit, including delayed listener registrations. No Web/HTML fallback or audio-session policy change.

**After owner reviews/merges PR #29**, Fetch/Pull `experiment/native-ios-audio` in the **`biblozoo-native-audio`** worktree, then:

```sh
node scripts/validate_native_app_switcher_pause_n4a1.js
node scripts/validate_native_melody_gameplay_n4a.js
node scripts/validate_native_feeding_resume_n21.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Run **BibloZoo Audio Test** on the actual iPhone (Node CI does not compile Swift):

1. **Classic exact reproduction:** Start active gameplay. Swipe up **and HOLD** to see the App Switcher thumbnails, but do not open another app; tap **BibloZoo's own app card**. **Welcome Back / Let's go! must appear**, with balls/score frozen and native audio not automatically playing. Tap Let's go! and confirm the original round, peg beeps, star/chomp and scores continue. The app-card thumbnail may be an OS snapshot, so report if its live visuals appear to advance.
2. **Melody exact reproduction:** Catch a few notes and note tune/Caught %. Open the same cards, tap BibloZoo's own card. After **Let's go!**, the **same tune and percent**, remaining notes and audio must continue, without new reward or restart. No output by itself in the switcher or on return.
3. **Regression:** Fully switch to YouTube/Facebook and back in both modes; test quick switcher open/close and Back. A real failed native re-preparation stays paused with Try again!/Back; a successful pending preparation continues to show **Let's go!** (disabled) instead of flickering Try again!.
4. **Diagnostics:** If returning to a silent running game, if Welcome Back doesn't appear or if native retry fails, **Copy DEV Audio Timing Report before restarting**; paste timing rows, native first-tap preflight and what was actually audible. A `scheduled` row is **not** an audible-speaker verdict.

**Gates:** Dedicated `scripts/validate_native_app_switcher_pause_n4a1.js` VM/source test covers inactive with `document.hidden=false`, return without inactive delivery, duplicate idempotence, pending Resume invalidation, async listener removal and Web isolation. Final GitHub Node regressions plus production web build are separate from **Swift Xcode compile** and **owner's live app-switcher/same-round audio acceptance**. Owner test is required before broadening N4 to Labyrinth/Bounce. See [N4a.1 iPhone protocol](N4A1-IOS-APP-SWITCHER-PAUSE.md), [AUDIO-RECOVERY](AUDIO-RECOVERY.md), [living handoff](PROJECT-HANDOFF.md).

---

### N4a — native Melody catches & same-song Resume (PR #28 merged; owner live Melody and full-switch audio recovered, App Switcher edge found)

**Verified owner gate:** N3d [PR #27](https://github.com/andydoane/biblozoo/pull/27) was **merged** as `58698938` into `experiment/native-ios-audio`. The owner physically heard DEV **Melody E4** and said the note played fine; **Classic Feeding worked as expected**. This confirms one native Melody tone and a Classic regression pass, **not** real Melody-game catch-note audio. Earlier N3c first-launch/task-switch sound and two fresh competing-YouTube-PiP starts were positive overall (one initial `feed-peg stale` preflight recovered on the next explicit prep; one clean), but the cause of that stale request remains unknown.

**[PR #28](https://github.com/andydoane/biblozoo/pull/28) N4a** routes actual `melody` Feeding mode on the **isolated native-only iOS test bundle** to the previously prewarmed six-voice, MIDI 55–83 `feed-melody` Swift bank. The activity's existing **Got It!** creates a mode-specific native pilot (only `feed-melody`, rather than Classic's star/chomp/peg IDs), requests Swift session activation, preloads the bank and starts the round **only after success**. Native failure keeps Instructions, Try Again and Back, never Web fallback. Each **caught note** invokes native MIDI output with the unchanged catch-percent/score/timeline/ball motion; missed notes stay silent. Web/PWA/Android original Melody oscillator path remains intact. After a real backgrounding, stop all native voices, freeze original `melody.pausedAt`/round; only a **human Welcome Back tap** re-prepares the bank then resumes **the same song and catch percentage**. Existing Classic, other native modes, Zoo Escape rules, microphone, profiles/rewards and .soloAmbient policy remain unchanged.

**After owner review/merge** using separate `biblozoo-native-audio` worktree: Fetch/Pull `experiment/native-ios-audio`, run:

```sh
node scripts/validate_native_melody_gameplay_n4a.js
node scripts/validate_native_melody_bank_n3d.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_feeding_resume_n21.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build **BibloZoo Audio Test** in Xcode on a physical iPhone. GitHub Node/production build cannot compile Swift or establish audibility.

1. Open Daily To-Do Preview → Feeding → **Melody**; select a tune and Tilt/Drag, tap **Got It!**. Confirm audible **different short pitches on actual catches** (not merely DEV E4), normal score **Caught %**, ball visuals, pet animation and correct missed-note silence. Try at least two tunes including high/low notes. The existing Melody tune/timeline/rewards code should be untouched.
2. **Mid-song app switch:** After a few catches, note song/percentage, open YouTube/Facebook/video, return. No notes or score should automatically resume; Welcome Back remains until tapping **Let's go!**. One explicit tap must re-preload only `feed-melody` and resume **same tune, next note, percentage, timer**, with audible sounds. Back must exit safely; retry on a real native refusal must keep the frozen round.
3. **First-launch/blocked audio:** On a cold launch or denied native prep, don't restart immediately. Instructions must display **Try Again** and a safe reason, not begin a known silent round. Tap DEV **Copy Audio Timing Report** and paste the 80-row event ring **plus 18 preflight outcomes**: `preload | feed-melody` and `feed-melody | scheduled | … | avengine-melody`. Distinguish human-heard output from software `scheduleBuffer`. Then deliberately retry. If playback was accepted but silent, say so.
4. **Classic/other mode regression:** Play Classic with pegged sine beeps, audible star/chomp, smooth animation and app-switch Resume. DEV **Melody E4** still works; Classic shouldn't preload Melody. Web/PWA/Android's original Melody remains identical. Labyrinth/Bounce native tones remain unmigrated; no native Web/HTML fallback, mic prompt, profile/reward changes or surprise Zoo minigame on audio error.

**Separate acceptance gates:** Node source/VM and web build, Xcode Swift compile, and *owner hearing notes during actual Melody gameplay with same-song Resume* are distinct. N4a only migrates Melody within Feeding; later N4 PRs must handle Bounce/Labyrinth. Full owner checklist [N4a native Melody gameplay](N4A-NATIVE-MELODY-GAMEPLAY.md), [AUDIO-RECOVERY](AUDIO-RECOVERY.md), [living handoff](PROJECT-HANDOFF.md).

---

### N3d — DEV native Melody single-note bank, before N4 gameplay wiring (PR #27 merged; DEV E4 audible, Classic passed)

**N3c [PR #26](https://github.com/andydoane/biblozoo/pull/26) merged** as `3ef3961e`. After merging, the owner reported a fresh-start Native Classic run with **actual sound working and successful mid-round task-switch Resume**; first gesture session `os-accepted`, star/chomp/peg preflights `prepared`, 80 retained gameplay rows all native `scheduled` within 0–2ms, no slow dispatch. **Two additional fresh-start trials with a YouTube video already in Picture-in-Picture (foreground epoch 0)**: first `gesture os-accepted`, star/chomp prepared, `feed-peg stale`; the owner had an initial snafu but successfully re-prepared with `gesture not-needed` and a now `prepared` peg, then heard normal sound. Second PiP trial had `os-accepted` and three successful preloads on the **first attempt** (star 109ms, chomp 42ms, peg 81ms), with no snafu. Both 80-row PiP reports show **0 slow native dispatches** (mostly 1–2ms, up to 3ms), no pending interruption. **`stale` identifies an obsolete preparation request; cause unknown.** PiP is background competing audio, not an app-switch/Resume test. No reports from a newer complete-silence event. This provides positive N3c listening evidence, not an exhaustive repeated first-build reliability gate.

**[PR #27](https://github.com/andydoane/biblozoo/pull/27) N3d** follows the N3 native tone/voice roadmap before N4 Feeding integration. Existing `daily_questions_feed_game.js` Melody gameplay still uses a **browser triangle oscillator** (silent under the experimental iOS global Web output guard), and its schedule, catch percent, clock and interruptions are NOT part of this slice. N3d adds a fixed `feed-melody` Swift triangle-wave **55–83 MIDI bank** (29 prebuilt 220ms PCM notes), **six** prestarted `AVAudioPlayerNode` voices, a validated 55…83 MIDI integer in native `play`, local `backend=avengine-melody`, and one new DEV-panel **Melody E4** button (fixed MIDI 64/volume 0.25). Only a deliberate DEV tap activates/prewarms/plays; no song, auto-play, microphone change, Web fallback or actual Melody-mode routing. Web/PWA/Android unaffected. Classic's existing native star/chomp/peg, N3c startup gate/Copy report, .soloAmbient/interruption/route teardown must not regress.

**After owner review/merge**, use the dedicated `biblozoo-native-audio` GitHub Desktop worktree to Fetch/Pull `experiment/native-ios-audio` and run:

```sh
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_melody_bank_n3d.js
node scripts/validate_native_peg_voices_n3b.js
node scripts/validate_native_first_launch_n3c.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build/run separate **BibloZoo Audio Test** on a **physical iPhone**; GitHub Node/production web CI **does not compile Swift or prove speaker sound**.

1. On **first launch after build**, in DEV tap **Melody E4**. Hear exactly one short musical pitched note (rather than any full tune), note loudness vs Classic pegs and sample star/chomp. Confirm DEV says native request—not falsely “heard.” If refused/silent, **copy DEV Audio Timing Report before restarting**, and report `gesture/session`, `preload/feed-melody` and any `feed-melody/avengine-melody` row plus actual audibility.
2. Repeat DEV Melody E4 taps to check no stuck/crackling sound; switch out to another app/video and tap again upon return. Only the human tap may reactivate/preload; no automatic foreground sound. Close DEV and verify all prepared notes stop.
3. Start normal **Native Classic** and confirm star/chomp immediately audible, peg beeps pleasant, game movement smooth, genuine task-switch same-round Resume and correct **Try Again** on any initial native-prep failure. Existing N3c last-18 preflight events and manual Copy report remain intact.
4. **Melody gameplay not yet migrated**: In isolated iOS it's expected to remain silent due to the native-only output policy; its catch score, tune selection, timers, result overlays/Back must be unchanged. Actual Melody native playback and proper Got It!/Resume timeline ownership are **future N4**, not achieved by this test.

Pass means owner really hears DEV E4 and sees no Classic/lifecycle regression. Keep successful software `scheduleBuffer` distinct from sound reaching ears. Technical/physical guide: [N3d native Melody note bank](N3D-NATIVE-MELODY-NOTE-BANK.md), [AUDIO-RECOVERY](AUDIO-RECOVERY.md), [living handoff](PROJECT-HANDOFF.md).

---

### N3c — first launch after build must not silently fail (PR #26 merged; owner initial startup + PiP testing positive, one stale peg preflight)

**Owner evidence after merged N3b [PR #25](https://github.com/andydoane/biblozoo/pull/25) at `29b424fa`:** Directly after Xcode build the *first* real iPhone launch was **completely silent** (no first-run report was copied). After restarting the app, two separate runs played **all** native sounds and the Classic peg beep was pleasant; both switched apps and both recovered successfully. The owner pasted **two 80-row reports (160 retained events)**: **0** slow dispatches >=120ms, almost all 1–2ms (0–3ms overall) from collision to native `scheduleBuffer` dispatch, zero worker wait, peg `avengine-tone` and chomp `avengine-pcm`. This confirms the audio engine and Resume are working *in those two runs*, not that the first-launch problem is fixed, and no report captured the failure mechanism. Actual acoustic onset is still not directly measured.

**[PR #26](https://github.com/andydoane/biblozoo/pull/26)** is a focused N3c reliability/diagnostics PR, not Melody/N4 migration. In Swift, the first actual **Got It!/Resume/DEV tap** now explicitly attempts bounded `AVAudioSession.setActive(true)` even if no prior interruption happened; subsequent healthy taps remain `not-needed`. This respects .soloAmbient, foreground/genuine interruption, activation cooldown/attempt caps and user-gesture-only policy. It is a plausible first-launch readiness change, **not proven root cause**. If native star/chomp/peg preparation reports failure, Native-only Classic **stays at the Instructions/Got It! gate** with a sanitized reason and enabled **Try Again** and Back, rather than beginning a round knowingly silent. No automatic recovery, Web/HTML fallback, new mic or silent session category behavior.

**The existing DEV → Copy Audio Timing Report** now includes last **18** native gesture and fixed-ID sample/peg preflight outcomes after the 80-event sound ring. The new preflight section shows `gesture/session os-accepted/not-needed/denied`, `preload/feed-star,feed-chomp,feed-peg prepared/failure`, `prepareMs`, foreground epoch, interruption pending and active app state. It is in memory only and copied manually; a **force quit/restart erases the diagnostic evidence**. A prepared/accepted backend does not prove the speaker actually made a sound.

**Owner after review/merge:** Fetch/Pull `experiment/native-ios-audio` in the dedicated `biblozoo-native-audio` worktree; from repo root:

```sh
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_first_launch_n3c.js
node scripts/validate_native_peg_voices_n3b.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) in Xcode and run on a physical iPhone, keeping original BibloZoo installed.

1. **First launch after the fresh Xcode build:** open Native Classic, press Got It! once. Confirm *actual audible* star/chomp/peg, smooth ball motion and correct normal game start. Ideally report shows `gesture | session | os-accepted`, three successful preloads. If game stays in Instructions with **Try Again**, that is an intentional preflight refusal, not a passed audio test.
2. **If completely silent or refused on first launch, do NOT restart the app yet.** While still in the failure state, tap **DEV → Copy Audio Timing Report** and paste here. State clearly whether gameplay had already started silently or the new gate prevented starting. Record the visible native reason. Only afterward optionally wait 4+ seconds (native OS activation retry cooldown), tap **Try Again** once, and report if that attempt restores real sounds. If initial preflight was accepted but speaker output was silent, the cause lies beyond the observed session/prepare success and must be investigated with more device evidence.
3. With successful sound, play multiple peg/star/chomp events. Ensure pegs are still pleasant, effects remain reliably close to collisions, the worker never blocks the game, and the 80-event timing logger/Copy button works. Native-only app must remain Web/HTML silent for unmigrated content.
4. **Task-switch and Resume:** while active, switch to another app/video, return, tap **Let's go!**, confirm same round/score/timer, audible sound and Back, with no misleading “Try again!” while *preparing*. A genuine refusal must keep the round paused and allow a deliberate retry instead of auto-resume. No recording, pet/reward or privacy regression.

**Separate evidence gates:** GitHub Node/VM regressions and web build ≠ Xcode Swift compilation ≠ software `scheduled` ≠ human-audible output. First-launch audible output still needs the owner's real test. See [N3c technical guide](N3C-FIRST-LAUNCH-AUDIO.md), [AUDIO-RECOVERY.md](AUDIO-RECOVERY.md), and [living handoff](PROJECT-HANDOFF.md).

---

### N3b — Native Classic peg notes, bounded overlap and Resume label (PR #25 merged; owner peg/Resume tests passed but first launch silent once)

**Confirmed owner N3a iPhone success after merged [PR #24](https://github.com/andydoane/biblozoo/pull/24):** In a manually copied timing report after task switching, there were **19 total native events** (including DEV samples) and **13 actual Feeding game star/chomp events** (2 stars, 11 chomps). All 13 used `avengine-pcm`, returned `scheduled`, took **1–5ms** collision→native dispatch with **0ms native worker queue wait**, and none took >=120ms. Owner said chomp audible timing no longer seemed delayed (or far less delayed), with smooth gameplay. DEV `pilot-unlock` remained native AVAudioPlayer, taking **873ms** for its first call and **31ms** later. **Actual Resume positive observation:** owner switched away to watch a Facebook video, returned, pressed the Feeding action (referred to as Got It!), saw a **brief “Try again!” label flicker**, but the **same game continued and native sounds worked**. Foreground epoch=1 and pending=false at report-copy time. This is strong real-device improvement, not proof of exact speaker onset or multi-cycle reliability.

**[PR #25](https://github.com/andydoane/biblozoo/pull/25), branch `experiment/n3b-native-peg-voices-resume-label`:** Native-only Classic Feeding now preloads an additional generated `feed-peg` resource **only** via an explicit Got It!/Resume gesture. Swift prepares six fixed pitched 105ms sine PCM buffers (the original Web Classic frequencies) and a bounded four-voice tone pool in the existing warmed AVAudioEngine. Star/chomp have **two** prestarted nodes each, so closely spaced sounds may overlap without unlimited playback. Real Classic peg collisions use a native sound ID plus integer note index 0–5, preserving the original **55ms cooldown** and immediate-repeat avoidance. No raw arbitrary frequencies, Web oscillator/HTML playback or new native input. Other native Feeding modes keep their intentionally unmigrated sounds silent. Lifecycle interruption/route/background stop all voices, no automatic replay.

The **Resume label** should keep **“Let's go!”** while `feedResumePending=true` and status says “Preparing native sounds…”, rather than briefly labeling busy preparation “Try again!”. On real failed native preflight, keep the frozen round visible and offer “Try again!” + Back. Existing Web/Zoo Escape label semantics stay unchanged.

**After owner review/merge** in the separate `biblozoo-native-audio` GitHub Desktop worktree, Fetch/Pull `experiment/native-ios-audio`; from repo root run:

```sh
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_audio_timing_n22.js
node scripts/validate_native_pcm_effects_n3a.js
node scripts/validate_native_peg_voices_n3b.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) on a physical iPhone, leaving original BibloZoo installed; **Linux CI does not compile Swift or hear speaker output**.

1. Start Native-only Classic and listen to normal peg collision beeps **alongside** star and chomp. The six short musical notes should be subtle, audible and not annoyingly loud; note whether they seem too quiet/loud, popping, stuck or missing. Try a ball hitting pegs quickly and two close stars/chomps to assess bounded overlap. The original Web app should retain its old oscillator pegs; no Web audio is permitted in `.audiotest`.
2. Confirm animation remains smooth and **star/chomp near-contact timing is still excellent**. The new overlap pool must not regress the 1–5ms N3a dispatch behavior or repeat more sounds after leaving.
3. Task-switch mid-Classic, return, tap Welcome Back/**Let's go!**. The button stays “Let's go!” while preparing, and a successful attempt continues **the same round, score, pet, timers and sound** without flickering “Try again!”. Back remains usable. If iOS refuses, the overlay should instead offer an actionable “Try again!” and reason, **not** silently resume or invoke Web Audio.
4. After playing tap DEV **Copy Audio Timing Report** and paste its text here if possible. Expect `feed-peg | scheduled | ... | avengine-tone` rows, alongside `feed-star` and `feed-chomp` rows marked `avengine-pcm`. A fast `scheduleBuffer` return **does not prove human-heard audio**; explain what you actually heard.
5. Confirm no unprompted recording, profile changes, duplicate rewards or output after backgrounding; peg beep migration is for **Classic only**, not Melody, Labyrinth, Bounce or all game audio yet.

**Acceptance remains owner-gated:** Xcode build, audio heard, pleasant bounded notes, reliable smooth star/chomp, task-switch Resume label + real error, and privacy/session safety. On failure supply the first Xcode compiler error or copied native diagnostic; do **not** restore Web fallback. More details: [N3b native peg/voice guide](N3B-NATIVE-PEG-VOICES.md) and [living handoff](PROJECT-HANDOFF.md).

---

### N3a — Native PCM-buffer effects instead of slow AVAudioPlayer.play() (PR #24 merged; owner confirms fast audible PCM + working Resume)

**Based on merged [N2.2 PR #23](https://github.com/andydoane/biblozoo/pull/23)** at `1941fb8`. The owner sent **two actual iPhone timing reports**: no-task-switch report 6 slow events of 14; task-switched report 7 of 13, **13 of 27** with `collision->native dispatch >=120ms`. **Twelve** slow events spent approximately **392–744ms in `AVAudioPlayer.play()`**; one other queued sound waited **457ms** behind a prior 459ms star effect. Physics collision→JS request and JS→native bridge were about **0–3ms**. Sounds were heard, and **gameplay remained smooth**, but some chomp acoustic onsets were late. This is a measured native method bottleneck, *not* proof of the acoustic onset instant or the internal reason AVAudioPlayer stalls. Task switching is not needed for delays. The owner **has not explicitly confirmed same-round Resume works after N2.1**, so this remains a test.

**[PR #24](https://github.com/andydoane/biblozoo/pull/24), branch `experiment/n3-predecoded-native-feeding-effects`, target `experiment/native-ios-audio`**, decodes `feed-star` and `feed-chomp` in Swift **during the explicit Got It!/Resume or DEV preload** using `AVAudioFile` → bounded `AVAudioPCMBuffer`, connects `AVAudioPlayerNode`s to one `AVAudioEngine`, starts the engine and warms the nodes (with no scheduled audible samples) **before** the round. On collisions, `scheduleBuffer(..., options:[.interrupts])` schedules the predecoded PCM; no per-event `AVAudioPlayer.play()`, MP3 decode or engine start. DEV pet-unlock **stays a native AVAudioPlayer reference**; Native-only/HTML Web sound isolation stays unchanged. Lifecycle/route/media reset invalidates the worker generation and tears down the engine; *only a new explicit gesture* may warm it again. No extra JS bridge per collision, new microphone permission, category or background entitlement change. One node per effect; future N3 voice pools and native peg beeps are **not** implemented here.

**After owner review/merge**, use dedicated `biblozoo-native-audio` GitHub Desktop worktree, Fetch/Pull `experiment/native-ios-audio`. From repo root:

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

In Xcode build/run **BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) on a **physical iPhone**, keeping original BibloZoo installed unchanged.

1. **Xcode compile is a separate gate**: the Linux CI source tests and web build cannot compile the AVFAudio Swift APIs. If compile fails, provide the *first Xcode error*, before any sound test.
2. **DEV**: play star, chomp and pet-unlock. Really listen. For star/chomp, DEV Inspect should indicate `backend=avengine-pcm`; pet-unlock remains `avfoundation-player`. No Web/HTML fallback. Any `pcm-decode-or-engine-start-failed`, `pcm-not-preloaded`, `effect-too-large-or-empty` or other new error is a **failure**, not a reason to resume the Web engine.
3. **Classic Feeding**: Daily To-Do Preview → Feeding Game Tester → Classic → Got It!. Play 1–2 minutes, including close-together star/chomp events; check every audible effect happens near pet/star contact, visual ball motion remains smooth, and repeated effects are not truncated unexpectedly. Native peg beeps intentionally remain silent until later N3.
4. **Copy a report** afterward using DEV **Copy Audio Timing Report** and paste it here. Compare rows labeled `avengine-pcm` to the old reports' 400–750ms `AVAudioPlayer.play()` stalls. `worker call` now measures `scheduleBuffer()` for effects; it **does not measure actual speaker onset**. Optional mark-last-chomp-late remains.
5. **Task-switch and Resume**: switch to another app mid-Classic and return; tap Welcome Back/Resume. Check same score/round resumes, Back works, no automatic/repeated sounds, no duplicate rewards, no interrupted recordings. This gate was not separately accepted after N2.1. Also test route change/silent switch if convenient and check output does not play spontaneously on foreground.

**Pass boundary:** Successful Xcode compile + all native effects audibly work + no visible hitch + tolerably consistent perceived onset + successful explicit same-round Resume. A native `scheduleBuffer` accepted response by itself is **not enough**. Failures need captured DEV status and timing or exact Xcode error, not a Web fallback. Full technical schema and rollback criteria: [N3a PCM effects guide](N3-NATIVE-PCM-EFFECTS.md); [living handoff §§9–10](PROJECT-HANDOFF.md).

---

### N2.2 — collect a native timing report after playing (PR #23 merged; owner reports analyzed)

**Historical test plan after merged [PR #22](https://github.com/andydoane/biblozoo/pull/22) at `07e91e3`, before N2.2 logs:** every star/chomp MP3 **audibly played** in Classic Feeding, and the previous per-sound **visual hitch is gone**. **Open problem:** some chomp sounds start near the pet/snack collision while others sound significantly late. No reliable timestamp/log was supplied; taking screenshots while playing is not reasonable. **Task-switch/Resume after PR #22 was not explicitly reported**, so it remains a required check, not a passed gate. No native peg beeps yet (N3), no Web/HTML fallback.

[PR #23](https://github.com/andydoane/biblozoo/pull/23), branch `experiment/n2-2-native-audio-timing-report`, implements **one-tap native clipboard reporting**, not a new low-latency sound engine. The fixed-schema Swift timing ring keeps only the latest **80** native MP3 playback events in memory; JavaScript sends an event ID plus physics collision and request timestamps on the *existing* native `play()` call. Swift records bridge arrival, serial queue wait and `AVAudioPlayer.play()` return time, and formats a plaintext report. The floating DEV panel's **Copy Audio Timing Report** invokes native Swift `copyTimingReport` and writes the report to `UIPasteboard.general.string`. No automatic network upload, file write, Zookeeper name, verse text, pet data or microphone recording. **Mark last chomp late (optional)** flags only the most recent chomp from the previous 60 seconds; if later sounds happened, it may not tag the sound noticed. Report rows use `-1` for unavailable/skewed wall clock; `AVAudioPlayer.play()` returned **is not equivalent to actual speaker output**. See [N2.2 timing report details](N2-2-NATIVE-AUDIO-TIMING.md).

**After owner review/merge:** in dedicated `biblozoo-native-audio` GitHub Desktop worktree, Fetch/Pull `experiment/native-ios-audio`, then:

```sh
git branch --show-current          # experiment/native-ios-audio
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_audio_timing_n22.js
node scripts/validate_native_feeding_resume_n21.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build/run the **separate BibloZoo Audio Test** (`com.andydoane.biblozoo.audiotest`) on a physical iPhone, not original/stable BibloZoo.

1. Open Daily To-Do Preview → Feeding Game Tester → **Classic**, tap **Got It!** and play normally for **1–2 minutes**. Enjoy the game; **no screenshot, debugger, or report controls during collisions needed**. Observe whether every chomp still plays and animation remains smooth, even when chomp seems late. Peg collision beeps remain intentionally silent.
2. Optional: after a late-sounding chomp, tap floating DEV → **Mark last chomp late (optional)** *within 60 seconds* if convenient. It flags the last chomp, so if several newer sounds occurred just skip marking; simply copying the report is enough.
3. When finished, tap floating DEV → **Copy Audio Timing Report** once. It should say **Copied N sounds! Paste into ChatGPT when ready.** This uses native iOS pasteboard to avoid losing WebKit's trusted clipboard gesture after asynchronous bridge reads. Paste into the chat with a sentence about how often you heard the delays. **No data is shared automatically**. As with any clipboard, only paste the report where you want it shared. If count is zero, confirm that the native-only test app played effects in the same app process; a force-quit/relaunch clears the ring.
4. Separately, **task-switch away and back mid-Classic**, use the Welcome Back/Resume control, verify the same score/round continues, Back works, and there are no double rewards or automatic sound replays. This acceptance check was still unconfirmed following PR #22.
5. If any native sound stops being audible or gameplay hitches again, report exactly what happened. The new timing feature must **not** affect the fixed output-only policy, mic permissions or user data.

**Report interpretation (for a future assistant/chat):** The report tracks each `feed-N` event's `collision->JS`, `JS->bridge`, `bridge->worker`, `worker play()`, `collision->native dispatch`. `>=120 ms` is an investigative threshold, not acoustic proof. JS Date.now and Swift Date are shared device wall time but may skew; queue/play call durations are monotonic. These logs cannot detect the exact moment of a sound reaching the speaker. **Separate CI static/VM passes, Xcode Swift compile, native request acceptance, actual child-heard audio, animation smoothness and Resume.** After owner test record precise outcome and whether we should address JS/Capacitor/worker/engine latency next. Do not infer automatic native audio success from the copied log.

---

### N2.1 — Native-only Classic Resume and MP3 playback hitch (PR #22 merged; historical test plan)

**Historical owner evidence after merged [N2 PR #21](https://github.com/andydoane/biblozoo/pull/21), before the N2.1 fix:** The DEV panel **actually played all three native samples**. Classic Feeding played **audible native star/chomp MP3 effects**; its Web oscillator **peg beeps were intentionally silent** (native beeps are N3, not a regression). But **each native sound caused about a second of visible game pause**, and after task-switching out/back the Welcome Back action did **nothing**, while Back still exited. This is a **partial N2 audio success and a FAILED smoothness/Resume gate**, not a fully working game. Owner did not supply exact Inspect values; do not invent a native decode timing or claim the hitch's cause is proven.

**[PR #22](https://github.com/andydoane/biblozoo/pull/22), feature branch `experiment/n2-1-feeding-resume-playback-hitch`** corrects the observed source-level button routing: `daily_questions_feed_game.js` created a dormant Zoo Escape controller, which had already attached its own Welcome Back action listener, so Feeding's old `if (!runtime.zooEscape)` condition wrongly omitted the Native-only Resume listener. Feeding now **always registers** its handler, but if the live backend is Web and Zoo Escape owns the button, the Feeding handler exits without interference. The Native-only click calls `attemptFeedingResumeFromGesture` to perform the bounded native session gate + fresh two-sample preload; it never uses a Web clock. The frozen round should unfreeze on successful native prep or stay retryable with Back on a real native failure.

The Swift plugin also moves `AVAudioPlayer(contentsOf:)`, `prepareToPlay()`, `play()` and `stop()` to a **single serial background playback queue**, keeping player access off the UI thread. It avoids calling `sound.stop()` before rewinding a rapid repeat (which could discard preparation). A lock-protected epoch invalidates stale queued player commands on background, interruption, media reset or route change; no automatic resume or false native audio success. The DEV Inspect panel now adds `lastSound`, `prepMs`, `queueMs`, `playMs`. These are local timings: **prepMs** = native MP3 setup duration; **queueMs** = wait before the worker processed a sound; **playMs** = time spent inside the native `play()` call. They are **not** a direct measurement of animation frame drops or whether sound was heard. N3 will add native peg tones and overlapping sample voices; they are **not** in this PR.

**After owner review/merge**, in GitHub Desktop use the dedicated `biblozoo-native-audio` worktree, Fetch/Pull `experiment/native-ios-audio`, then:

```sh
git branch --show-current                   # experiment/native-ios-audio
node scripts/validate_native_audio_test_identity.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_feeding_resume_n21.js
node scripts/validate_native_sound_smoke_test.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

Build and run **BibloZoo Audio Test** (bundle ID `com.andydoane.biblozoo.audiotest`) on a **physical iPhone**; do not overwrite the stable installed BibloZoo. The target is *normal, responsive gameplay*, not only native sound accepted.

1. **DEV baseline:** Play native star and chomp; both should still be **heard**. Tap **Inspect native state** and copy, if possible, the simple `lastSound=...`, `prepMs=...`, `queueMs=...`, `playMs=...` values. `pending`/interruption trace remain read-only; no special need to interpret all fields.
2. **Repeated Classic sounds:** Daily To-Do Preview → Feeding Game Tester → Classic → Got It!/Drag. Trigger several separate stars/chomps, including repeats close together. Confirm native MP3s are **heard**, whether motion **still pauses ~1 second** on each hit, and whether dragging/ball animation stays responsive. **Peg beeps remain silent by design.** If hitch persists, copy DEV timing values *immediately afterwards*; note whether `playMs` or `queueMs` are large, or instead both remain small (then investigate game/JS animation).
3. **Task-switch / Resume:** With a running Classic round, switch to another app, return, then press the visible Welcome Back **Let's go!/Resume** control. It should respond, reprepare native sounds on the gesture, dismiss the overlay and continue **the same score, ball state and timers**. Back must still exit. Test a second switch if possible. No surprise Zoo Escape, no automatic replay, and no hidden Web audio.
4. **Rejected native state:** If iOS reports `interruption-pending`, `activation-cooldown`, or a player error, the game should remain paused with an explicit retry and usable Back, not silently claim success or award points. Save the status/trace; a real interruption must not be cleared by a fake Web recovery.
5. **Protect stable behavior:** Menus, pets/progress/rewards, exit and recording permissions remain unchanged. Check no duplicate rewards after resume, no delayed sound after hiding, no Web UI sound or unintended microphone startup.

**Evidence labels:** source/static+VM and GitHub Actions passing != Xcode Swift compile != human-audible native effects != smooth animation or functional Resume. Log each separately in the [living handoff](PROJECT-HANDOFF.md) after the owner's test. Do not proceed to N3 native tones until the hitch and Resume have been characterized or corrected.

---

### N2 — native-only AVAudioSession lifecycle / explicit gesture gate (PR #21 merged; historical test plan)

**[PR #21](https://github.com/andydoane/biblozoo/pull/21) was merged as `53377d2e`.** The owner confirmed DEV native samples and Classic star/chomp MP3s were **audible on iPhone**. The original interruption origin has not been proven by a fresh trace. The owner additionally reported a ~1-second gameplay hitch on every MP3 and an inert Welcome Back Resume (Back worked); see the N2.1 section above for the corrective PR and device checks. Read [N2 native session state design](N2-NATIVE-SESSION-LIFECYCLE.md) and [living handoff §10](PROJECT-HANDOFF.md) before merging.

**What N2 changes:** `BibloZooNativeSoundPlugin.swift` is now the authoritative **native-only output-session decision point**. A new `activateFromGesture({purpose:"dev"|"feeding"})` bridge call happens on the real Play/Got It!/Resume tap *before* native sample preload. If there is no pending session event, it returns `not-needed` without activating. An unresolved genuine `.began` cannot be cleared by a foreground observation or elapsed timeout; after a **completed inactive/background → active return** a new tap can request one bounded `AVAudioSession.setActive(true)` retry (max two attempts per foreground and four seconds apart). The OS can accept or reject; accepting does **not** prove human audible sound. Suspended-history `.began` is counted but not treated as a fresh interruption. `.ended` clears pending; route/media reset disposes old players without auto-replay. `.soloAmbient` and microphone category are unchanged. The old Web-clock recovery bridge is disabled **only in `.audiotest`**, without replacing sound with HTML/Web fallback.

The DEV **Inspect native state** now displays `foregroundEpoch`, reset/activation counters and an in-memory, bounded `trace=#seq:event@elapsedMs` tail. This is read-only and contains no profile, verse, or microphone content. Event chronology is diagnostic evidence, not speaker audibility.

After *your review and merge* of PR #21, in the separate `biblozoo-native-audio` GitHub Desktop worktree Fetch/Pull `experiment/native-ios-audio`, then run:

```sh
git branch --show-current       # experiment/native-ios-audio
node scripts/validate_native_audio_test_identity.js
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_only_ios_output.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

In Xcode confirm the **BibloZoo Audio Test** target's bundle identifier ends with `.audiotest` before running on a **physical iPhone**; the original installed BibloZoo must remain separate.

1. **Fresh foreground / baseline:** force quit the test app, relaunch it, and *before pressing any DEV Play button* tap **Inspect native state**. Note `app=`, `pending=`, `last=`, `began/ended/suspended`, `foregroundEpoch=` and the event tail. No sound or session activation should occur on Inspect.
2. **Native DEV audibility:** tap **Play star**, **Play chomp**, optionally pet-unlock, and **actually listen**. On success, status says native playback *requested*, not proved. Inspect again. Copy event tail and `activation=`. If it says `interruption-pending`, do not conclude the plugin broke or use a Web fallback. **If still pending without any departure from foreground, another tap must remain deferred**.
3. **Native-only Feeding:** Daily To-Do Preview → Feeding Game Tester → Classic → Drag → **Got It!**. There is no Web checkbox. Peg beeps are intentionally silent. Listen for actual star/chomp on game events; otherwise record `Native ONLY unavailable (reason); sounds SILENT` and DEV trace. Confirm scoring/Back still works, with no audio-failure Zoo Escape launched.
4. **Return/explicit retry:** while Classic is active, switch to a different app and return. The round should remain frozen with **Resume** or Back, and no sounds should automatically replay. Tap Resume: the Swift native session gate runs, then fresh star/chomp preload. If the prior interruption stayed pending, a user tap **after** the completed foreground return can ask the OS to reactivate; note `activation-os-accepted` vs `activation-os-rejected`, cooldown or limit and whether actual sounds are heard. Don't repeatedly tap to manufacture success; wait at least four seconds before any next attempt.
5. **Route/reset/silent and privacy sanity:** if practical, connect/disconnect headphones/Bluetooth, check silent switch, leave/reenter app, and verify old effects do not replay late. Navigate to Learn/Flashcards/Read My Verse cautiously; microphone capture must not start automatically, recordings/progress must remain intact. Nonmigrated sound output/Flashcards meter can still be missing from N1. No native tone engine or random Zoo surprises yet.
6. **Evidence for next chat:** report which actual sample(s) were heard, *before and after* state/trace strings, exact reason on silence, any freeze/navigation/reward issue, app switching sequence and any recording impact. This decides whether N2 requires a follow-up or whether N3 can proceed; no automated Node run is a substitute for iPhone audio.

**Automation limits:** GitHub Node/VM tests check adapter gesture ordering, safe no-Web fallback on rejection, trace shape, Swift source guards and existing Feeding regression behavior; web build checks the N1 injected gate. They do not compile Swift or reproduce real iOS AVAudioSession interruption notifications; distinguish passing CI, Xcode compilation and human-heard audio in the handoff.

---

### N1 — globally silence WebKit sound output in the separate iOS audio experiment (merged; historical acceptance checklist)

**Status:** [PR #20](https://github.com/andydoane/biblozoo/pull/20) **merged** to `experiment/native-ios-audio` as `6303ce79` on November 7, 2026. Final-head CI passed Node regressions and production web build, including all **33** packaged HTML pages. The owner reports the N1 test app worked as described, including expected silence in unmigrated features. This is a qualitative acceptance of the isolation experiment, **not a new chronological interruption trace** or full all-native audio signoff. See [living handoff §§9–10](PROJECT-HANDOFF.md) and [the source inventory](NATIVE-ONLY-IOS-AUDIO-INVENTORY.md). This **supersedes the C.2d same-app Web-A/B instructions below**: after N1 the separate `.audiotest` app intentionally has **no Web audio fallback**, and the experimental Classic tester automatically selects Native. Use the **original stable BibloZoo app** for a separate Web comparison.

**Implementation to verify:** `npm run build` copies web sources into ignored `dist/` and, *only when* Capacitor `appId` is `com.andydoane.biblozoo.audiotest`, inserts `verse_games/shared/native-only-ios-output.js` as the **very first HTML script** in every packaged root/game/Playground/utility HTML. The guard becomes active only under native Capacitor iOS/`capacitor:` origin: `AudioContext` and `webkitAudioContext` are unavailable; `HTMLMediaElement.play()` for **audio** rejects rather than reporting false success; HTML videos run muted; parsed/dynamically added autoplay audio is suppressed. The Swift AVAudioPlayer plugin and DEV native sample buttons are unchanged. **No** `getUserMedia` or `MediaRecorder` interception is introduced, but Web Audio microphone metering and HTML recorded-take playback may be unavailable while unmigrated. Some older `new Audio()` and `load()` calls still exist and may still affect the native session **without playing sound**. N1 does **not** claim to fix `interruption-pending`.

From the **`biblozoo-native-audio` worktree** after owner merge:

```sh
git branch --show-current                 # experiment/native-ios-audio
node scripts/validate_native_only_ios_output.js
node scripts/validate_native_feeding_preview_c2.js
node scripts/validate_native_sound_smoke_test.js
npm run build
node scripts/validate_native_only_ios_output.js # checks every injected dist HTML
npx cap sync ios
npx cap open ios
```

Build/run **BibloZoo Audio Test** (confirm Xcode bundle ID ends in `.audiotest`) on the physical iPhone, **not** the original app. Do not delete/reinstall the stable BibloZoo or infer it shares profiles with the experiment.

1. **Native-only output boundary:** launch title/home, tap ordinary buttons, visit a standalone practice game and a Playground activity. Web-era tap, oscillator, HTML narration, and other **unmigrated** sounds should be silent; do not use old C.2d unchecked Web sound as a comparison within this app. The app should still navigate/exit normally; record any screen trapped on a now-impossible Web audio success gate as a functional regression to address in the next owner-specific slice.
2. **Native DEV proof:** open **DEV · Native Audio**, tap **Play star**, **Play chomp**, optionally the pet-unlock sample. Record each sound **actually heard**, along with any native error status and `Inspect native state` snapshot. The native plugin alone is permitted to produce output. Its bridge `accepted` result is not audibility proof.
3. **Classic Feeding pilot:** open Daily To-Do Preview → Feeding Game Tester → Classic → Drag → Got It!. In `.audiotest` there is no visible Web backend checkbox; the preview should say **Native ONLY**, pegs intentionally silent. Native star/chomp are either human-audible or explicitly unavailable/silent with error. Log whether `pending=YES began=1 ended=0` still appears **before** prepare and whether the DEV panel behaves differently after the failed Feeding attempt, without switching apps. **Do not bypass an actual iOS interruption.**
4. **Lifecycle and state:** task switch during Native Classic, return, verify frozen round and deliberate Native Resume/Back with no audio-failure-driven Zoo Escape. Visit Learn and a recording-capable screen without granting microphone accidentally; preserve navigation, stored progress and partial takes. Meter/recording playback may be unavailable temporarily; **do not claim the entire microphone/recording experience is accepted** until N7.
5. **Non-iOS/stable:** independently verify web/PWA/Android and the existing stable BibloZoo baseline still produce their normal sounds if feasible. The native-only gate should be inert there; Linux CI checks source isolation and bundled scripts but does not simulate the real iOS session or speaker.

**Node/CI evidence boundaries:** the new validator checks source sandbox behavior in VM and, after build, every packaged HTML for guard placement/relative URL. Existing regression suites and production web build remain required. GitHub Actions cannot compile Swift, sign the app, hear an iPhone, prove the audio session is healthy, or guarantee every legacy UI remains fully usable while output is suppressed. All failed audio-dependent navigation/recovery must be documented, not masked by Web fallback.

---

#### Historical C.2d procedure below — retained as regression history, not the current N1 device checklist

### C.2d — owner-directed **Native ONLY** Classic Feeding preview

**Evidence and decision (November 7, 2026).** After merged [PR #17](https://github.com/andydoane/biblozoo/pull/17), one iPhone test showed `pending=no, began=0, ended=0` across all clock-first trace phases, but the Web-clock probe failed and the preview chose `Web (native unavailable: web-clock-unavailable)`; the owner heard **no Feeding sound**. The very same build still **audibly played the native DEV star button**. Earlier traces also showed `interruption-pending` *before* checking the Web clock. This means the Web-clock gating/fallback made the Native test ambiguous; it does not prove what initiated any iOS interruption.

**Owner's clarified goal:** use this isolated iOS experiment to learn whether **native-only** sound can replace Web Audio in BibloZoo. Do not silently select Web sounds when Native was checked. A silent native effect with an accurate error is more informative than a disguised Web fallback. Zoo Escape's current connection to failed-audio retry is an older workaround; after reliable native playback is established, consider **separate, random Zoo Escape and Zoo Break surprises**, unrelated to audio health. **This PR does not implement those random features or change existing earned Daily Feeding.**

**C.2d implementation is bounded to the experimental iOS Classic Feeding tester:** on entry it defers its *Feeding-owned* Web Audio/HTML sound allocation until/unless the tester explicitly starts an **unchecked Web** round. With the checkbox checked, **Got It!** prepares only the allowlisted native `feed-star` and `feed-chomp` players; there is no Feeding Web Audio context, clock probe, synthesized peg beep or HTML star/chomp fallback in that round. The iOS app's other screens may still have their own Web sound code—this is a **first isolated test slice**, not a claim that the whole app has been migrated. Peg tones are not yet implemented natively and are intentionally silent. If native `preload` or `play` fails, the backend stays **Native**, displays `Native ONLY unavailable (reason); sounds SILENT` or `Native ONLY failed (reason)`, and does not play Web. The score/game physics continue for diagnosis, with exit available. The previous read-only native interruption snapshots remain for tracking, not for a success claim.

On an interruption or app switch, the **Native-only** preview still freezes on the original Welcome Back screen, but does **not** launch Zoo Escape as an audio-repair minigame, create/resume a Web Audio context, or run a Web-clock probe. A fresh, deliberate **Resume** gesture re-prepares only the native IDs before unfreezing the same round. A failure keeps the round paused with Retry/Back; no automatic restart or reward. Unchecked Web Classic and all normal Daily Feeding/other modes retain the old recovery behavior. `.soloAmbient` and microphone policy are unchanged.

**After owner merges the focused C.2d PR into `experiment/native-ios-audio` ONLY**, select the Mac `biblozoo-native-audio` GitHub Desktop worktree → Fetch/Pull, and in its VS Code terminal run:

```sh
node scripts/validate_native_feeding_preview_c2.js
npm run build
npx cap sync ios
npx cap open ios
```

Build/run the separate **BibloZoo Audio Test** App target `com.andydoane.biblozoo.audiotest` on a **physical iPhone**, not original BibloZoo.

1. **Web comparison:** Daily To-Do Preview → Feeding Game Tester → Classic → 1 or 2 question stars → Drag. Leave Native **unchecked**, tap Got It!, confirm peg beeps, star and chomp remain audible, catch/score/Back unchanged.
2. **Native ONLY:** Exit, reopen the same Classic preview, check **DEV: Native ONLY (no Web fallback; star + chomp)**, Got It!. The status must say Native ONLY, never Web. **Peg beeps are intentionally silent.** Actually listen for native **star** when a star peg is hit and **chomp** when catching food, including several consecutive events. These are the **only** two tested Feeding sound effects. No web UI pop or doubled effect.
3. **Real failure observation:** If Native `preload` fails with `interruption-pending` or missing bridge, preview remains explicitly Native but silent; copy exact badge and optional `DEV → Inspect native state` counts. **Do not count a silent effect as success**, but silence is an unambiguous failure, not a hidden Web substitute.
4. **Native task switch/Resume:** After at least one star/chomp, switch apps, return, verify game stays frozen and no surprise audio/Zoo Escape recovery minigame runs. Tap **Resume** to re-prepare native sounds with a new user gesture, or **Back** to exit. Failed native retry stays paused; no Web fallback, no unintended reward/score change. Then repeat ordinary Web recovery separately to confirm it was not modified.
5. Confirm real earned Daily Feeding, Labyrinth, Melody, Bounce, Web/PWA/Android, saved profiles, records and original installed BibloZoo remain unchanged. Stage D reliability measurement remains blocked until **human-heard** native gameplay and safe Native-only Resume are confirmed.

**Automation limits:** Source/VM checks guard no Web preflight/fallback/oscillator in selected Native, explicit Web comparison, failure status, preparation and lifecycle ownership, plus existing Feeding/Zoo Escape regressions and web build. GitHub Node CI cannot compile Swift or confirm iPhone audio, and this is **not** yet a production design for peg tones or Zoo surprises.

### C.2c — verify Web Audio clock **before** native preflight, trace interruption phases

**Owner's real iPhone result after merged [C.2b / PR #16](https://github.com/andydoane/biblozoo/pull/16):** Default unchecked/Web Feeding still sounds normal. Checked Native Classic is **silent for native star/chomp**, even though the diagnostic version also muted synthesized Web peg beeps. The bottom-right badge says **`Native effect failed (interruption-pending)`**. Owner's DEV screenshot after finishing a 7/7 catch round (score 11) reads: **`app=active pending=YES last=began events=1 began=1 ended=0 suspended=0 route=0 reasonCode=0 ageMs=15208`**. This is evidence of a recognized interruption-start notification not followed by an observed end; **it does not prove** whether WebKit Web Audio, AVAudioPlayer, another audio app or another session condition initiated it. Working game score is not evidence of audible audio.

**C.2c source hypothesis:** With the current C.2b code, native star/chomp are prepared **before** `startRound()`; after that, `startRound()` may call `resumeFeedAudioContext()` if the Web Audio context isn't running. Both iOS AVAudioPlayer samples worked in isolation in C.1. C.2c moves a **bounded, advancing Web Audio clock check** to the trusted **Got It!** gesture **before** any native preload. The app calls the original `resumeFeedAudioContext(runtime.audioContext)` synchronously within that tap, then checks `feedAudioClockAdvances(context)` using the existing 180ms clock probe. If the context is missing/closed, the resume fails/times out, or the clock does not advance, the DEV preview **falls back to Web before starting**; it does not reattempt native in-round or change `AVAudioSessionCategorySoloAmbient`. If the Web clock changes again during native preflight, the preview likewise chooses Web **before starting**. A successful clock probe does **not** imply hardware output is audible, and the native bridge still enforces interruption safety.

**Read-only DEV phase timeline:** With the native checkbox checked, a small bottom-right text panel records `pending`, `began`, `ended`, `events`, `last` and `reason` using `BibloZooNativeSound.getDebugState()` around these phases: **before-web** (requested on the separate checkbox-change gesture), **after-web** (clock verified or failed), **after-native** (both sounds prepared or denied), **round-start**, and **play-fail** (only if native playback was rejected). Requests are asynchronous and individually bounded to 500ms; **they are observational, not an exact causal ordering guarantee**, particularly `before-web` which is sampled on an earlier user gesture. These values stay in memory/on this experimental view; no new network logs, profile names, verse data, or sound recordings are written.

After the owner merges the **C.2c PR into `experiment/native-ios-audio` only**, in GitHub Desktop select the `biblozoo-native-audio` worktree on the experimental branch → **Fetch Origin → Pull Origin**. In its VS Code terminal:

```sh
git branch --show-current                   # experiment/native-ios-audio
node scripts/validate_native_feeding_preview_c2.js
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode build/run **BibloZoo Audio Test**, ID `com.andydoane.biblozoo.audiotest`, on the actual iPhone; preserve the original BibloZoo installation and user data.

**Specific A/B retest:**
1. In **Daily To-Do Preview → Feeding Game Tester → Classic → 1 or 2 question stars → Drag**, leave DEV Native **OFF** and tap **Got It!**. Confirm full Web audio (peg beeps, star and chomp), scoring and ordinary gameplay still work.
2. Exit, repeat the same Classic tester setup, check **Native**, observe the **before-web** snapshot, and tap **Got It!**. A brief bounded clock probe occurs *before* the two native preloads. The badge will identify **Native star/chomp ONLY (Web peg beeps muted for test)** if selected, or **Preview audio: Web (native unavailable: reason)** if a check failed before round start. This C.2b peg mute is still diagnostic—don't mistake absent peg beeps for success. Look for the small phase timeline. **You must actually hear the native star on star-peg hits and chomp on snack catches** for this to pass.
3. If you see **Native effect failed (interruption-pending)** again, screenshot the **phase timeline** and the existing **DEV · Native Audio → Inspect native state (no sound)**. Report which phase first shows `began` increment or `pending=YES`, the bottom-right badge and the actual sounds heard. If Web fallback happens before the round, report its exact reason; do not claim Native gameplay was tested.
4. If both native effects work reliably, repeat several star/chomp events and switch to another app and back. Verify no background replay and only the existing **explicit Resume** with native dual-preflight and Web clock verification resumes the frozen round; Back/Zoo Escape remain available. Check preview score/progress/no duplicate rewards.
5. Confirm real Daily Feeding, Labyrinth/Melody/Bounce tester modes, Web/PWA/Android, microphone, mute behavior and existing app data remain untouched. Stage D reliability measurement is still **on hold until owner approves C.2c's actual iPhone output**.

**Regression limit:** The Stage C.2 test executes the real JS startup source with instrumented Web resume and clock probes to enforce **resume → advancing Web clock → native preload → game start**, missing/stalled/changed-clock fallback before round, stale diagnostic requests, and no duplicate audio; the pre-existing Feeding/Zoo Escape regressions remain. GitHub Linux CI does **not** compile Swift or demonstrate actual iPhone session behavior or audio audibility. This is a controlled startup-order hypothesis, **not** a validated root-cause fix.

### C.2b — native star/chomp versus Web Audio collision beep isolation (experimental)

**Owner's iPhone result after merged [PR #15](https://github.com/andydoane/biblozoo/pull/15):** The DEV checkbox now visibly checks; default unchecked **Web** Classic Feeding sounds and gameplay work normally. With the **Native** box checked, the regular synthesized **peg beeps remain audible** but the star and chomp **do not sound**. The bottom-right test label says **"Native effect failed. Exit preview to retry."** This means C.2 gameplay is **not accepted** even though both samples worked in C.1's separate DEV native buttons. The generic label did not expose whether the bridge rejected a play request with `interruption-pending`, `not-preloaded`, `play-denied`, a timeout, or another error. Web Audio / AVAudioPlayer competition is a **hypothesis**, not a proven cause.

**C.2b diagnostic only:** On the separate `.audiotest` iPhone app, when **Classic Feeding Game Tester** is explicitly checked **Native** and gameplay is active, suppress *only* the synthesized non-star **peg beep oscillator**. This tests whether normal Web Audio tone emissions affect native playback. Keep the actual Feeding Web Audio **context/clock**, task-switch recovery, score, collision physics, stars, snack catches, Zoo Escape and all default **Web** audio behavior. Zoo Escape's optional sounds while paused are unchanged. Other modes and normal Daily Feeding are untouched; the isolated native mode is not a proposed permanent release mix.

The experiment now labels successful native preflight as **"Native star/chomp ONLY (Web peg beeps muted for test)"**, and a rejected native play as **"Native effect failed (reason). Exit preview to retry"**. `reason` is the short allowlisted-format error code returned by the existing bridge, not proof that a sound was/wasn't heard. No new activation, `setCategory`, `setActive`, background entitlement or automatic Web fallback mid-round.

**After owner merges only into `experiment/native-ios-audio`:** GitHub Desktop → `biblozoo-native-audio` on `experiment/native-ios-audio` → Fetch/Pull, then VS Code terminal:

```sh
node scripts/validate_native_feeding_preview_c2.js
npm run build
npx cap sync ios
npx cap open ios
```

Build/run **BibloZoo Audio Test** (bundle identifier `com.andydoane.biblozoo.audiotest`) on a real iPhone. Run the following controlled comparison:
1. **Unchecked Web baseline:** Daily To-Do Preview → Feeding Game Tester → Classic → 1 or 2 question stars → Drag → Got It! Confirm synthesized peg beeps **plus** normal star and chomp sounds.
2. **Checked Native diagnostic:** Repeat the identical Classic setup, check Native and Got It!. Badge should mention **Web peg beeps muted**. **No synthesized peg beeps is expected in this one test**. Listen for actual **native star on star-peg collision** and **native chomp when the pet catches food**. No ghost/double sounds and no score or physics changes.
3. If either native effect fails, **report the exact badge string in parentheses**, such as `interruption-pending` or `not-preloaded`, and use the **DEV · Native Audio → Inspect native state (no sound)** button to capture `pending`, `began`, `ended`, `suspended`, and `reasonCode`. Do not infer that muted peg beeps mean the native path works; only *heard star/chomp* count as the device result.
4. If native star/chomp now work, repeat several effects and a task switch → **explicit Resume**, and check Zoo Escape/Back remain available. We will then study how to provide peg tones without recreating the failure. If they still fail, use the captured reason for the next narrow fix rather than changing `AVAudioSessionCategorySoloAmbient` or bypassing genuine interruption.
5. Real Daily Feeding, other tester modes, Web/PWA/Android, daily rewards, recordings and stable BibloZoo must stay unchanged.

**Validation limit:** `scripts/validate_native_feeding_preview_c2.js` executes the actual `playPegTone` source in a VM to verify that Native Classic skips the Web oscillator but Web Classic still emits it, plus checks the safe error-reason UI, preflight, default-off logic, and existing task-switch/Feeding/Zoo Escape contracts. Node CI does not prove actual speaker output, Swift lifecycle callbacks, or the cause of any iPhone interruption. **Do not advance to Stage D** until native gameplay has actually passed on-device and a safe path for the missing peg beeps is decided.

### C.2a — native Feeding checkbox failed to toggle on iPhone

**November 6, 2026 device result after merged [PR #14](https://github.com/andydoane/biblozoo/pull/14):** Classic Feeding Game Tester **default Web audio works normally**, but tapping the **DEV: Native star + chomp** checkbox shows **no checkmark or visible change**. This prevents selecting the native backend, so **there is no native Feeding gameplay acceptance yet**. This is not a problem with the owner's instructions.

**Confirmed source bug:** `daily_questions_feed_game.js`'s delegated `runtime.startOverlayHandler` handles all intro clicks and always calls `event.preventDefault()` immediately. On iPhone, that suppresses the default action of the new nested HTML `<label><input type="checkbox"></label>` in the Classic tester intro. **C.2a** exempts only the opt-in label and input from cancellation (but stops bubbling to other app controls). The normal Tilt/Drag/Got It! handlers keep `preventDefault`; real Daily Feeding, other tester modes and web/PWA still never offer the checkbox.

The experimental checkbox now updates nearby status text **immediately on change**, before the final Got It! tap: **"Native selected. Tap Got It! to check both sounds."** or **"Web effects selected (default)."** It starts unchecked in each preview and is disabled only while both native samples are being prepared after Got It!, preventing a selection change after preflight starts. No native playback, AVAudioSession, fallback, progress, Zoo Escape or reward code was changed. New validation executes the **actual delegated click handler** with a checkbox/label default simulation, checks the opt-in text and confirms ordinary intro events still have their original cancellation behavior; this does not replace a physical iPhone interaction test.

**Retest after owner merges C.2a into `experiment/native-ios-audio` only:**

1. In GitHub Desktop use the separate `biblozoo-native-audio` worktree → Fetch/Pull. From its VS Code terminal run `node scripts/validate_native_feeding_preview_c2.js`, `npm run build`, `npx cap sync ios`, `npx cap open ios`. Build/run the `.audiotest` Xcode App target; keep the original BibloZoo installed.
2. Open **Daily To-Do Preview → Feeding Game Tester → Classic → 1 or 2 question stars → Drag**. On the final intro screen, tap both the checkbox **square** and **label text**. The first tap must **visibly check** the box and show **Native selected**; the next tap must **uncheck** it and show **Web effects selected**. This must not start the round or change the chosen control.
3. Close/reopen the tester. Checkbox must start **unchecked**, with Web selected. Tap **Got It!** and verify Web audio works as before.
4. Repeat with the checkbox **checked**, then tap **Got It!**. Only now should the test app prepare star/chomp, and the status badge should show **Native star/chomp** or **Web (native unavailable)** if preflight fails *before* the round. Actually hear gameplay star/chomp and compare with Web; no duplicates. Check task-switch Welcome Back/Resume, score, and that tester preview awards no real Daily To-Do progress.
5. No opt-in controls should appear in real Daily Feeding or Labyrinth/Melody/Bounce tester modes. If the checkbox remains unresponsive, the Native status never appears, or game audio/recovery fails, report exactly what happened and **hold Stage D**.

### Stage C.2 — default-off native Feeding **Classic tester preview** (experiment-only)

**Owner acceptance of merged [PR #13 / C.1](https://github.com/andydoane/biblozoo/pull/13):** The original pet-unlock and both **actual Feeding star/chomp MP3s** were audible on the iPhone through numerous rapid, consecutive presses and after task switches. User reports occasional first-launch Xcode-app lag that also occurred across earlier builds and went away after closing/relaunching; **this is an observation, not a proven C.1 audio bug or performance measurement**. Stage C.2 may proceed as an experiment, not as proof that a full Feeding game now works reliably.

**What C.2 implements:** On the **separate BibloZoo Audio Test** iOS app, only in **Daily To-Do Preview → Feeding Game Tester → Classic**, the two-step Feeding intro shows a **DEV: Native star + chomp (off by default)** checkbox after choosing Tilt/Drag. Checking it is explicit per-preview consent, never saved to progress or reused for another game. The button and intro deliberately opt out of the global Web Audio UI pop to keep this comparison isolated. **Other modes (Labyrinth, Melody, Bounce), real Daily Feeding, the public app, web/PWA and Android remain web-only**. No app or iOS audio-session category/mode/activation changes.

When the checkbox is ON, **Got It!** first calls the fixed-ID Capacitor plugin to preload *both* `feed-star` and `feed-chomp` with bounded deadlines. If plugin, interruption state or bundled sound is unavailable, **before gameplay starts** it chooses the normal web sounds instead; a small preview-only label says **Preview audio: Web (native unavailable)**. On success the label says **Preview audio: Native star/chomp** and only these two events use the native player. Classic's regular peg/collision tones remain Web Audio. The native play path never also dispatches a web/HTML MP3 for the same event. A failure **during** a native round does *not* silently change backends: the event stays silent and the label asks the tester to exit/retry. Gameplay score, timing, progress and earned rewards are unchanged.

Native players stop on exit, finish, background and existing Feeding pause. Upon **explicit Resume** after switching away, the same activity-owned Web Audio clock recovery still runs; a native preview additionally must re-prepare **both** samples from that gesture before the original frozen round may continue. Neither `preload`, `play`, an advancing Web Audio clock nor a successful bridge result is proof of hardware audibility. The existing Zoo Escape recovery/exit remains available and does not award simulated points. The experiment may reveal remaining interactions between Web Audio collision tones and native effects; do not hide a genuine failure.

After owner merges this PR **only into `experiment/native-ios-audio`**, in GitHub Desktop choose `biblozoo-native-audio` → Fetch Origin → Pull Origin, then in the VS Code terminal:

```sh
git branch --show-current                 # experiment/native-ios-audio
node scripts/validate_native_sound_smoke_test.js
node scripts/validate_native_feeding_preview_c2.js
npm run build
npx cap sync ios
npx cap open ios
```

Xcode: Build and Run the **BibloZoo Audio Test** App target on a physical iPhone, bundle ID `com.andydoane.biblozoo.audiotest`; do not overwrite the normal BibloZoo app. All C.1 MP3 resources are unchanged.

**A/B acceptance on the same iPhone, same hardware volume, sound route, and mode:**

1. Enter **Daily To-Do Preview → Feeding Game Tester → Classic → 1 or 2 question stars** to guarantee star pegs. Choose **Drag** initially. Leave the new native checkbox **OFF**, tap Got It, and catch snacks/hit star pegs. This is the untouched **Web** baseline, identified by the small status label.
2. Exit preview and repeat the identical setup, this time **check DEV: Native star + chomp**, then Got It. Expect a bounded loading moment before the round, status **Native star/chomp**, distinct audible star/chomp samples on gameplay events, no doubled MP3s and no unexpected native sound at startup. Continue to catch multiple snacks. Ordinary collision tones still use Web Audio; do not confuse those with native star/chomp.
3. Repeat a few Classic previews to compare lag/latency. Observe whether a first-launch lag appears **in both Web and Native runs** before attributing it to the native pilot. Test silent switch deliberately; `.soloAmbient` may mute audio normally.
4. During an **opted-in native** round, switch to another app and back. The round should remain frozen and present the existing Welcome Back / Zoo Escape process, **not** resume by itself. Press the real Resume control: Web Audio's established recovery *and* native re-preparation must succeed before the same game continues. Listen for new star/chomp effects (never stale/replayed ones). If native preflight fails, the overlay must let you retry or exit—no web backend flip, no lost daily progress.
5. Try an error scenario only if it occurs naturally: if label says **Web (native unavailable)**, the fallback happened **before** start and the round should still make normal web effects. If **Native effect failed**, note the event, label and device state; exit the preview instead of relying on a silent mid-round replacement. Testing the DEV preview must not award actual Daily To-Do completion or second prizes.
6. Confirm **real Daily Feeding** and tester **Labyrinth, Melody and Bounce** behave as before, without any opt-in controls; exiting or backgrounding a preview must not leave stale native voices.

**Source/CI regression:** `scripts/validate_native_feeding_preview_c2.js` tests missing plugin, invalid IDs/volume, timeout, dual preload, late/stale responses, one backend per effect, native failures, web fallback before round, and preview-only UI. It is experiment-only in GitHub CI alongside existing Feeding/Zoo Escape tests. **Linux CI cannot compile Xcode, reproduce the iOS interruption sequence, or verify actual sound, reward persistence or first-launch performance.** Report audible quality and exact label/status if something fails; keep this experiment isolated until iPhone acceptance is reported.

### Stage C.1 — independent native Feeding sample preparation (experiment-only)

**Gate for starting C.1:** Following merged [PR #12](https://github.com/andydoane/biblozoo/pull/12), the owner reports **five consecutive native-only pet-unlock taps were all audible in one foreground session** and native sound also played through tested app-switch returns. The DEV test suppresses the normal Web Audio UI pop. The native readout may show a pending, unmatched interruption `.began` after a switch (`began=2`, `ended=1`), but a notification count does not prove the speaker is silent; do not ignore an actual rejected native request. There is no claim the iOS interruption-reporting edge case is completely understood.

**Purpose:** before integrating actual Feeding gameplay, prove that the same isolated `BibloZooNativeSound` bridge can preload and play **two existing, correctly named samples** as well as pet-unlock. This is a *native resource/player proof*, not Stage C.2 Feeding backend routing.

- Existing checked-in `verse_images/daily_questions/dq_feed_star.mp3` and `dq_feed_chomp.mp3` are explicitly included in the Xcode App target's **Copy Bundle Resources**, alongside `ui_pet_unlock.mp3` (separate from `dist` web assets). Logical allowlisted IDs `feed-star` and `feed-chomp` map only to those bundled files.
- The Capacitor plugin now owns one **independent `AVAudioPlayer` for each allowed ID**; preparing one cannot replace the prepared player for another. At most three known voices can be held; new preload/replay of a given ID restarts that same voice, while different clips can coexist. Invalid IDs, nonfinite/out-of-range volume, interruption/background/route changes and the original `.soloAmbient` category guard retain their existing policies. No app-wide session activation or new category.
- The **DEV · Native Audio** panel has two additional buttons, **Play star** and **Play chomp**, alongside the existing pet-unlock button and read-only state inspection. All are explicit user-tap-only, separate from normal Web Audio pop and **never called from Feeding**. The developer panel is not production UI.
- `scripts/validate_native_sound_smoke_test.js` checks the three committed assets, Xcode resource memberships, strict ID-to-resource mapping, independent players and JS tap/timeout/background/dismissal behavior; CI does **not** compile or run native Swift.

**After the owner merges C.1 into `experiment/native-ios-audio` only**, in GitHub Desktop select the `biblozoo-native-audio` worktree (not `ios-prep`), Fetch Origin → Pull Origin, then in VS Code:

```sh
git branch --show-current                    # experiment/native-ios-audio
node scripts/validate_native_sound_smoke_test.js
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode's App target check Signing & Capabilities uses `com.andydoane.biblozoo.audiotest`, and Build Phases → Copy Bundle Resources lists `ui_pet_unlock.mp3`, `dq_feed_star.mp3`, and `dq_feed_chomp.mp3`. Run the separate **BibloZoo Audio Test** app on a real iPhone; preserve the original BibloZoo installation and saved profiles.

**Audible acceptance:** With silent mode OFF and hardware volume up, tap **Play native test sound**, **Play star**, **Play chomp** separately; confirm three distinct **actual** sounds, not an ordinary button pop. Repeat each 3–5 times **without task switching**, then switch apps and return, tap again, and inspect optional native state. No sound should play automatically; the DEV panel should never play two samples for one tap. Also try the silent switch on/off; intentional silence under `.soloAmbient` is expected. Any `bundled-asset-missing`, `not-preloaded`, `interruption-pending`, Swift compile errors, or unexpectedly silent sound requires investigation before C.2. Note exactly **which** sample was heard and the panel message; bridge `accepted` is not proof of audibility.

**Stage C.2 remains blocked:** No Feeding game event dispatch, automatic engine switching, default-on behavior, microphone/reward/progress changes, or Zoo Escape/audio-recovery integration has been implemented here. The planned next PR will offer a **default-off, manually opted-in tester preview** only, choose the sound backend before starting a round, and preserve the web path when the native preflight fails. Do not conflate success of a 3-button manual test with actual gameplay reliability.

### Stage B.2 — isolate the native sound and inspect the *actual* interruption event

**Owner's corrected November 6 iPhone report after merged [PR #11](https://github.com/andydoane/biblozoo/pull/11):** On the developer **Play native test sound** button, **every tap makes a short UI pop**, but the separate **pet-unlock/native MP3** is usually heard only on the **first tap** after launch or after returning from another app. The second consecutive tap plays **only** the pop and reports `No new native sound requested: iOS interruption pending`. After app switch → return, the first tap again plays both sounds, and the cycle repeats. Sometimes even the first native MP3 is silent. **This is a reproducible failure**, not a passing Stage B acceptance. Stage C Feeding remains blocked.

**Source explanation:** `app.js` has a global, *capture-phase* `touchstart`/`pointerdown` feedback handler that plays `ui_audio/ui_sound_pop_1.mp3` or `ui_sound_pop_2.mp3` (or a short generated fallback) on ordinary buttons. It already skips any ancestor with `[data-no-ui-sound]`. The native smoke test had been an ordinary `<button>`, so **each tap triggered two independent audio paths**: Web Audio pop before the native bridge, and the test `ui_pet_unlock.mp3` only when `preload`/ `play` was accepted. A rejected native preload cannot emit the second clip. The persistent `.began` interruption **might** be related to these competing gestures, but this is **not proven**.

**Focused B.2 diagnostic experiment** on `experiment/native-sound-isolated-diagnostics` (targets `experiment/native-ios-audio` only):
- Add `data-no-ui-sound` to the entire **DEV · Native Audio** panel. Its button no longer triggers BibloZoo's global UI pop, Web Audio unlock or generated tap sound. **All ordinary app buttons remain unchanged.**
- Add one *read-only* `BibloZooNativeSound.getDebugState()` bridge method exposing bounded, **in-memory** numeric counts of interruption began/ended/suspended/route notifications, the last interruption reason code and age, the plugin's pending flag and app state. It cannot play, setActive, change category, record speech, access user data or automatically resume.
- Add **Inspect native state (no sound)** on the developer panel. It displays `app=… pending=… last=… events=… began=… ended=… suspended=… route=… reasonCode=… ageMs=…`. It makes no audio request. The existing tap/play/stop behavior and interruption guard remain intact.
- Add Node VM and native source-contract checks proving test UI suppresses normal pop, the new method is read-only, and a diagnostic tap cannot trigger native `preload` or `play`. These tests do **not** reproduce iOS notification delivery, and GitHub CI does not compile Swift.

**After owner merges**, in `biblozoo-native-audio` worktree on `experiment/native-ios-audio`, Fetch/Pull and run `node scripts/validate_native_sound_smoke_test.js`, `npm run build`, `npx cap sync ios`, `npx cap open ios`, then Xcode Build/Run the **`.audiotest`** App target on a real iPhone. Do not install over `com.andydoane.biblozoo`.

**Four-step diagnostic test (capture the exact panel text):**
1. Fresh launch, with sound enabled. Tap **Inspect native state (no sound)** and note `events/began/ended/pending` before any sample. This button must be silent.
2. Tap **Play native test sound** once. **There should be no UI pop**—listen only for the pet-unlock MP3. Tap **Inspect native state** again and note `began/ended/pending/last/reasonCode`.
3. Tap **Play native test sound** a second time **without switching apps**. Record whether a **second actual MP3** played or the panel says `interruption-pending`. Inspect state once more. A `began` increment between steps 2 and 3 would confirm an interruption notification arrived, but **not what caused it**. A `reasonCode` is diagnostic, not a definitive cause.
4. Switch to another app and return, then inspect before and after a fresh tap. Compare pending status and event counts. Confirm **no spontaneous audio**, and normal game buttons continue to have their pop.

If native playback now works repeatedly without UI pop, investigate the Web Audio gesture/audio-session interaction in a **separate controlled PR**, rather than changing category or automatically activating audio. If failure persists, use the native event readout to identify the next narrow fix. **Do not bypass a genuine `.began` interruption just to make a sound play.** Keep Stage C blocked until repeatable consecutive native taps work on-device.

### Stage B.1 — intermittent `interruption-pending` after audible native output

Owner's November 6, 2026 iPhone acceptance of merged [PR #10](https://github.com/andydoane/biblozoo/pull/10): **the native test button produced audible sound across the tested scenarios**, but the small panel also sometimes reported `Could not prepare: interruption-pending`. Do not treat either observation as proving that the same **blocked** tap made sound. In the PR #10 JS flow, a failed `preload` *returns early* and cannot invoke that tap's native `play`.

Apple notes that iOS may deliver a **delayed `.began` notification after a process is suspended**, indicated by `AVAudioSessionInterruptionWasSuspendedKey`. The first plugin also set its pending flag for any **unknown/malformed** notification (`kind != .ended`) and could retain a real `.began` forever after returning if no matching ended signal arrived. [Apple documentation](https://developer.apple.com/documentation/avfaudio/avaudiosession/interruptionnotification).

**B.1 follow-up on `fix/native-sound-interruption-state`**, targeting **`experiment/native-ios-audio` only**:
- Switch on a recognized interruption type. A genuine `.began` blocks a new tap while the app remains active; `.ended` clears it. An unknown type **does not** fabricate a begin or override an existing genuine pending state.
- A `.began` carrying `wasSuspended=true` is a delayed historical event and does not set a new pending latch. It still stops/forgets any old sound. If an independent genuine interruption is already pending, retain that state.
- If a genuine `.began` was followed by an **inactive → active** lifecycle transition without `.ended`, mark the state eligible for a **fresh explicit-tap retry**. Do not clear or resume automatically upon foreground activation; only when a user invokes a new `preload`/`play`, and let AVAudioPlayer itself accept/deny. No `setActive`, `setCategory`, `setMode`, automatic audio or gameplay routing.
- The developer UI says **“No new native sound requested”** on a blocked preload; a successful fresh retry reports whether the signal was a delayed suspension or a foreground-tap retry. The panel never asserts audible output.

In the Mac experimental worktree, after owner merges the focused B.1 PR, Fetch/Pull `experiment/native-ios-audio`, then:

```sh
git branch --show-current            # experiment/native-ios-audio
node scripts/validate_native_sound_smoke_test.js
npm run build
npx cap sync ios
npx cap open ios
```

**Required device retest before Stage C:** rebuild **BibloZoo Audio Test** (bundle ID must still end in `.audiotest`) on the physical iPhone. Tap with sound on, then repeat background → foreground, lock/unlock, quick app switches, silence switch and route changes as available. Listen for a new single sound **per tap**. The panel should not remain stuck on `interruption-pending` after a full return, and should never play by itself. If `interruption-pending` appears **during a genuine active interruption**, the blocked tap must not request a sound; try again after the interruption ends/return. Report exact sequence, panel text and whether the sound was actually heard. If the blocker persists, keep Stage C on hold and create another small follow-up.

This follow-up is a **hypothesis-driven correction**, not proof of hardware sound or that every interruption can be distinguished by notifications. The Node validator tests JavaScript behavior and Swift source contracts; **Xcode compilation, the actual iOS notification sequence and audible recovery remain physical-device checks**.

### PR B: one-sound native iPhone smoke test (experiment branch only)

The `experiment/native-sound-smoke-test` PR adds a branch-only `BibloZooNativeSound` Capacitor 8 plugin (`ios/App/App/BibloZooNativeSoundPlugin.swift`). It uses **AVAudioPlayer** with one allowlisted ID `pilot-unlock`, mapped to existing `ui_audio/ui_pet_unlock.mp3`. Xcode's App target **Sources** explicitly includes the Swift file, and **Copy Bundle Resources** explicitly includes the MP3 at the root of the app bundle. This is *separate* from the copied `dist/ui_audio` web asset; the plugin looks up `Bundle.main.url(forResource: "ui_pet_unlock", withExtension: "mp3")`. No new binary asset or rights assumption is needed.

The developer panel `verse_games/shared/native-sound-smoke-test.js` appears at the top-right of **the experimental native iOS app only**. It is installed for this experiment, deliberately not public-release UI. There is **no auto-play or gameplay routing**; a human tap sends `preload("pilot-unlock")` followed by `play("pilot-unlock", volume:0.85)` with bounded JS wait, then offers an honest prompt asking whether the sound was **actually heard**. A native `accepted:true` is NOT a sound-health/recovery verdict.

After the owner merges this PR **into `experiment/native-ios-audio` only**:

```sh
# Run from the biblozoo-native-audio worktree; Fetch/Pull Origin first.
git branch --show-current            # experiment/native-ios-audio
git status --short                   # clean before building
node scripts/validate_native_audio_test_identity.js
node scripts/validate_native_sound_smoke_test.js
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode's **App** target: verify **Signing & Capabilities** still has bundle ID `com.andydoane.biblozoo.audiotest` and the owner's development Team. Inspect **Build Phases → Compile Sources** for `BibloZooNativeSoundPlugin.swift` and **Copy Bundle Resources** for `ui_pet_unlock.mp3`. If the test asset is missing at runtime, check that resource phase before modifying Web Audio or `dist`. Run on the **real iPhone**, not just simulator; leave the original BibloZoo installed.

Manual gate — report observed results rather than assuming them:
- Launch **BibloZoo Audio Test**: normal app works; **no sample sound on launch**. See small **DEV · Native Audio** panel; if absent, confirm the native project actually rebuilt and the test app is current.
- Tap **Play native test sound** once: a brief unlock sound should be audible with sound enabled. The panel should say **"Native playback requested. Did you hear the sound?"** only when native `AVAudioPlayer.play()` reported accepted. This is **not** automated proof of hearing.
- Repeat with silent switch enabled: audio may be silent under intentional `.soloAmbient`; do not call that a defect. Compare with sound on and stable BibloZoo at the same hardware volume.
- Background/lock/unlock, then foreground: there must be **no automatic replay**. Tap again; confirm audible output. A task switch while a preload is pending should cancel the old JS request and native sound rather than queue a stale sound.
- Try wired/headphone/Bluetooth output and route changes if available: sound should follow current output on a fresh tap, never self-resume or leave a repeating clip.
- Tap **×** to dismiss the test panel: native sound stops and the panel does not interfere with normal gameplay. Feeding effects and the Web Audio/HTML recovery/Welcome Back/Zoo Escape paths are intentionally **unchanged**.
- In the case of **Native bridge missing**, **bundled-asset-missing**, `category-not-soloambient`, Xcode Swift compiler errors or silent output despite sound enabled, report the exact label/error; **pause before Feeding PR C**.

The plugin deliberately never calls `setCategory`, `setMode`, or `setActive`. It guards `.soloAmbient`, foreground and interruptions; rejects non-allowlisted IDs/invalid volumes; and forgets the player on app inactivity, route changes and media resets. These safeguards do not replace recording/microphone tests later.

**Automated check:** `node scripts/validate_native_sound_smoke_test.js` validates static Xcode source/resource memberships and runs the real smoke JavaScript in a Node VM for missing-bridge, missing-asset response, bounded timeout, double-tap, background cancellation, explicit tap and no web/PWA UI. It is added to the experiment-only CI job. GitHub Actions do **not** compile Swift or verify actual iPhone audibility; the owner's reported results decide whether PR C is allowed.

## 3. Existing automated validation commands

**Package scripts currently declared in `package.json`:**

```sh
npm run validate:daily-questions
npm run validate:daily-question-sessions
npm run validate:daily-question-generators
npm run validate:daily-zoo-todo
npm run validate:daily-feed-game
npm run validate:read-my-verse
```

**Additional direct Node validators relevant to recent systems:**

```sh
# Feeding selection, input locking, visuals/physics and audio
node scripts/validate_patch73_feeding_controls.js
node scripts/validate_patch73_feeding_controls_polish.js
node scripts/validate_patch73_1_feeding_polish.js
node scripts/validate_feeding_audio_bounce_patch24.js

# Zoo Escape and achievement safeguards
node scripts/validate_patch72_1a_zoo_escape.js
node scripts/validate_patch72_1b_feeding_zoo_escape.js
node scripts/validate_patch72_1c_whole_app_zoo_escape.js
node scripts/validate_patch72_1c1_whole_app_test_harness.js
node scripts/validate_patch72_1c2_identity_artwork_exit.js
node scripts/validate_patch72_1c3_zoo_escape_sounds.js
node scripts/validate_patch72_1d_zookeeper_stats.js

# Other recovery/recording owners
node scripts/validate_playground_welcome_back_patch68.js
node scripts/validate_flashcards_patch69.js
node scripts/validate_read_my_verse_audio_patch70_2.js
node scripts/validate_read_my_verse_feedback_levels.js
node scripts/validate_app_audio_patch23b.js
node scripts/validate_learn_narration_recovery_gate.js

# Verse Launch Game Menu / How to Play / Speed Menu / bonus pause
node scripts/validate_verse_launch_menu_pause.js

# Committed LF source and consistent macOS worktrees
node scripts/validate_tracked_lf_endings.js

# Experimental iOS app identity (only on the native-audio experiment branch)
node scripts/validate_native_audio_test_identity.js

# PR B explicit native sound test (experiment branch only)
node scripts/validate_native_sound_smoke_test.js
```

This is a **starting selection, not every validator**. There are many historical `scripts/validate_*.js` programs. Choose the suites appropriate to the change, and run broader recovery/regression coverage for shared code. Record precise failures; don't label a failing old test “outdated” without investigating it. Check for actual missing runtime assets versus broken code.

### Automatic GitHub Actions validation for `ios-prep`

The workflow [`.github/workflows/ios-prep-validation.yml`](../.github/workflows/ios-prep-validation.yml) was merged in [PR #3](https://github.com/andydoane/biblozoo/pull/3). It runs when **any PR targets `ios-prep`** (including when new commits update that PR) and whenever commits are **pushed or merged to `ios-prep`**. There is no path filter, so documentation-only PRs trigger the checks too.

GitHub will display two separately named jobs:

- **Node regression checks:** `npm ci`, the committed-blob LF line-ending guard, all six existing package validation scripts, Feeding 73–73.1, current Zoo Escape/statistics, Verse Launch menu pause, Flashcards, Read My Verse, and app audio tests.
- **Production web build:** `npm ci`, `npm run build`, then checks that key `dist/` runtime files were created.

The jobs use an Ubuntu runner, Node.js 22, read-only repository permissions, npm lockfile, and no deployment credentials. **This is not a native Xcode/iOS build, an App Store release, or a GitHub Pages deployment.** Physical iPhone and offline/audio-interruption tests still belong to the owner.

Some older patch-specific validators hard-code historic service-worker cache version strings (for example an Oct 26 stamp). The included Flashcards Patch 69 validator was updated in this CI PR to check the **durable versioned-cache and offline-asset contract** instead of requiring an obsolete Patch 72.1 substring. Other historical validators with stale patch-version assertions remain outside this initial CI selection; do not mistake their absence for full recovery regression coverage. For related changes, run older tests deliberately, refreshing stale assertions only when their underlying contract still applies.

**Learn narration return gate (focused fix on `fix/learn-narration-recovery-gate`):** `scripts/validate_learn_narration_recovery_gate.js` uses the actual Learn recovery functions in a simulated media-clock harness. It asserts that an advancing narration clock can succeed even when the unrelated UI Web Audio unlock fails or hangs, and that blocked/stalled media, stale attempts, second interruptions and source changes cannot fake success. It is included in CI for this PR; physical iPhone listening remains mandatory. Older `validate_learn_resume_overlay_patch19a.js` has historical expectations for the replaced two-engine gate and is not the acceptance test for this change.

**Verse Launch menu pause (proposed in `fix/verse-launch-menu-pause`):** `scripts/validate_verse_launch_menu_pause.js` executes the actual Verse Launch menu and loop callbacks against a simulated clock/animation scheduler, covering conveyor stop/restart, Help and Speed overlays, bonus asteroid/menu pause, and task-switch/Welcome Back overlap. Included as a dedicated CI step on this PR. In the original source the bonus asteroid loop already skipped menu/help physics; this fix also freezes the shared activity clock while a local overlay owns pause, without releasing a pending Welcome Back pause. Manual iPhone checks must verify visible word motion, bonus timer/asteroid movement, Help/Close/Mode Select, and backgrounding with menus open.

**Read My Verse beep level audit:** [Feedback Sound Level Audit](READ-MY-VERSE-FEEDBACK-LEVELS.md) records the per-activity gain comparison to external games and the owner hearing checklist. This proposed PR also registers `node scripts/validate_read_my_verse_feedback_levels.js` in CI. Static and virtual Web Audio gain tests do **not** measure actual output loudness; compare on a physical iPhone at the same hardware volume.

**How to see results:** Open [Actions filtered to `ios-prep`](https://github.com/andydoane/biblozoo/actions?query=branch%3Aios-prep) for post-merge push runs. A PR's **Checks** tab (and overall Actions history) shows its PR-triggered run even though its head is a feature branch; filtering Actions by `branch:ios-prep` may not show every pre-merge PR run. Workflow files and run history are separate: when first introduced, confirm the workflow appears and that GitHub reports actual jobs before telling the owner CI passed. Recheck GitHub Actions repository settings if events are disabled.



## 4. Physical iPhone smoke tests

Choose cases from each affected group and report device/iOS version when useful:

| Feature | What to check on the device |
| --- | --- |
| Main app / Current Verse | Main home, Verse selection, font, clickable Current Verse, navigation to My Verses |
| Feeding — four modes | Two-step Tilt/Drag chooser, full-size icons, Got It!, selected-input isolation, Tilt permission denial fallback |
| Bounce and Melody | Larger ball/snack art, collision geometry, Melody note/contact synchronization, Bounce between-serves flow |
| Labyrinth | Different per-ball acceleration/weight feel and non-overlapping platform impact sounds |
| Learning and 12 games | Learn Listen/Chunks/Echo: narration time actually advances on return even if UI sounds fail; frozen narration keeps retry/Zoo Escape. Verse Launch: word rockets/score should freeze when Game Menu, Help or Speed Menu is open; asteroid bonus time, entities and delayed actions should freeze through Game Menu/Help, then resume without jump. Check menu while task-switch Welcome Back is pending. Preserve verse, chunk, score and timer across switching; other games retain their own real audio-clock recovery |
| Playground — 5 activities | Preserve text/drawing/musical state and return cleanup |
| Flashcards / Read My Verse | Preserve recording/playback state; no auto microphone restart |
| Zoo Escape | Stage 2 / Stage 3 / pending interruption / safe exit / pet rescue state after repeated backgrounding |
| Daily Questions and Zoo To-Do | One-time completion, correct reward protection and special exit routing |
| Accessibility | Reduced Motion, tap-then-pen alternative, readable controls and screen-reader announcements |
| Offline | Correct local images/fonts/sounds and standalone game shell behavior in the intended web or native deployment |

If an interrupted AudioContext *won't* fail, use the deliberate developer harness to test visuals and exit. **Developer simulations do not validate genuine rescue achievement credit**. Do not break native audio or mark those unobserved achievement events as passed.

## 5. Results and release status in PRs / the handoff

Keep separate labels:

- **Implemented in PR:** Code exists on a PR branch, not yet on `ios-prep`.
- **Automated validated:** State exact commands, commit/ref, and pass/fail output; command suggestions aren't results.
- **Merged to `ios-prep`:** Verify PR merge and target commit.
- **iPhone verified:** Owner actually tested the merged (or checked-out PR) build and reported success.
- **Release-ready:** Separate gate: all mandatory tests/acceptance done, developer test controls disabled, native signing/version/privacy checked.

For every PR, revisit the [handoff](PROJECT-HANDOFF.md), update its date/baseline/current work/technical decisions in the **same PR**, and explain in the description what changed. Never copy stale milestone statuses forward without checking GitHub.

## 6. Test and rollback hygiene

- Preserve user saves, localStorage keys, profile IDs, backups, and rewards. If migration is necessary, validate old and new values and fail safely.
- Test both success and failure/deferred/exit paths for recovery and lifecycle work; no accidental double completion.
- Check resource cleanup (timers, RAF, pointer events, audio contexts, background observers).
- Test web/PWA offline caching and native Capacitor packaging separately; update asset cache manifest/version only when relevant to runtime changes.
- Keep PR changes focused for straightforward review and Git revert. If the owner discovers a regression, prefer a small follow-up PR; if serious, revert the merged PR deliberately rather than layering unreviewed local patches.

## 7. Documentation-only PR acceptance

For the initial living-handoff PR, review the Markdown files, README link, PR template, and cross-links against current `ios-prep`. No gameplay, audio, service worker, bundle version, or native file should be changed. Report documentation inspection separately from tests that were *not run*.

New PRs should keep this testing guide updated as commands, CI, and release workflows evolve.
