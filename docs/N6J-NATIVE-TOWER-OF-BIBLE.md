# N6j — Tower of Bible native iOS audio: owner test guide

> **CURRENT RESULT — OWNER ACCEPTED (2026-11-08):** [N6j PR #51](https://github.com/andydoane/biblozoo/pull/51) was **MERGED** to `experiment/native-ios-audio` at `1593a98bb60709582e8fa6b1a5fd4ac9a7e9d07d` (Nov 9 00:17:54 UTC). The owner now reports **successful usual real-iPhone tests without issues**. Tower of Bible is the **ninth of 12 owner-accepted standalone native games (9/12)**; specific device logs or each individual test scenario were not supplied, so don't invent them. Older pending sections below are the historical test plan, not current status. Next is open [N6k Verse Launch PR #52](https://github.com/andydoane/biblozoo/pull/52) awaiting separate Mac Swift/iPhone validation. Stable `ios-prep`, installed BibloZoo, Web/PWA/Android and mic/Zoo unchanged.

## Starting point and scope

Owner merged [N6i Versey Bird PR #50](https://github.com/andydoane/biblozoo/pull/50) on 2026-11-08 as `5d6378fbd3ee441bd2def561975a5c8ed2f340a0`. **Owner has now reported successful iPhone testing of Versey Bird** (exact steps/device metrics not supplied). This brings native standalone games to **8 of 12 accepted** and is the baseline for N6j.

N6j migrates only Tower of Bible (`verse_games/tower_bible`). Its six existing recorded gameplay effects + two Web-generated word cues + two fixed UI pops are preloaded as **10 fixed native PCM sounds**, using the already-proven sole Swift `.soloAmbient` session, serialized `AVAudioEngine` and real tap-only `activateFromGesture`.

| Original event | Native fixed sound ID | Source |
| --- | --- | --- |
| `brickLand` | `tower-brick-land` | `tower_bible_land.mp3` |
| `warning` | `tower-warning` | `tower_bible_warning_1.mp3` |
| `dangerWarning` | `tower-danger-warning` | `tower_bible_warning_2.mp3` |
| `collapse` | `tower-collapse` | `tower_bible_collapse.mp3` |
| `brickBreak` | `tower-brick-break` | `tower_bible_break.mp3` |
| `streak` | `tower-streak` | `tower_bible_success.mp3` |
| `correctWord` | `tower-correct-word` | Fixed native PCM: 523/659/784/1046 Hz sine sequence; baked original 3.40 volume tuning |
| `wrongWord` | `tower-wrong-word` | Fixed native PCM: descending 220→170 Hz + 170 Hz triangle; baked original 3.60 volume tuning |
| `uiTap1`, `uiTap2` | `ui-pop-1`, `ui-pop-2` | Existing shared predecoded UI MP3s |

The extra shipped `tower_bible_place.mp3` is **not referenced by gameplay**; deliberately leave it unchanged. The word cues have no existing shipped MP3: instead of substituting silence, Web Audio or an invented sound, the same Swift PCM worker **precomputes a close synthesis of their original frequencies/envelopes at preflight**. The physical iPhone must confirm timbre, volume and recognizability.

### Nonnegotiable behavior

- Native iOS: **no Web Audio, no HTML audio and no silent fallback**. Game-specific `native-tower-bible-audio.js` owns a bounded 10-ID bank and plays only predecoded `AVAudioPCMBuffer` in the shared Swift worker. No additional AVAudioSession, engine, category/mode change or dynamic asset paths. Browser/PWA/Android retain original unchanged Web oscillators, gain values and MP3s.
- Only actual Title/Help/Back, Mode select, Game Menu/Speed Close, Retry and **plain Welcome Back Let's go** taps may ask Swift for session priority. Title first-tap needs just the two shared UI effects. Mode/Close/Resume/Retry must prepare **all 10** before movement/timers resume; no UI success toast.
- YouTube PiP can play while the app is foreground: native `.soloAmbient` may be reclaimed on a real tap per #49, not automatically. OS-rejected/`other-audio-playing` is transient: plain Welcome Back retry, **not** a terminal gray error. A true missing asset/bridge failure gets accessible Retry and Back.
- Retain the same brick sequence, difficulty, tower alignment, belt speed, collapse, warning levels, Frenzy bomb actions, streak BibloPets, selected verse, score/rewards and timers. UIKit held App Switcher pauses with virtual `welcomeClock` and a user tap rewarms the bank; no time advances while away or queued sound ghost on return.
- Original installed BibloZoo, stable `ios-prep`, web/Android, mic and Zoo remain untouched. **Do not merge before owner-heard actual iPhone testing.**

## VS Code terminal: test PR #51 before merging

In the **dedicated `biblozoo-native-audio` worktree** (not stable `ios-prep`), choose VS Code → **Terminal → New Terminal**.

```bash
git status --short
git fetch origin
git switch --track origin/experiment/n6j-native-tower-of-bible
# If the branch already exists locally:
# git switch experiment/n6j-native-tower-of-bible
# git pull --ff-only origin experiment/n6j-native-tower-of-bible

npm ci
node scripts/validate_native_tower_bible_n6j.js
node scripts/validate_native_versey_bird_n6i.js
node scripts/validate_native_pip_takeover_n6h2.js
node scripts/validate_native_pip_interruption_n6h1.js
npm run build
node scripts/validate_native_only_ios_output.js
npx cap sync ios
npx cap open ios
```

If `git status --short` shows modified/untracked work, **do not discard it**. Ask for help first. If the `--track` command says this branch already exists, run the two commented local-switch/pull lines without the `#` prefix. Verify Xcode scheme **App** builds separate **BibloZoo Audio Test** `com.andydoane.biblozoo.audiotest` onto a **physical iPhone**. Linux CI Node tests and production web build do not compile Swift, evaluate audio routes or prove speaker audibility.

### Human-heard iPhone checklist (report results before merging)

1. **New entry, UI/modes:** Hear Title Start/Back/Help/Close pop and mode selection pop; Easy/Medium/Hard should enter gameplay after a successful quiet full-bank preparation. No routine gray loading popup. Retry/Back only for actual native failure.
2. **Eight distinct gameplay cues:** Hear *correct word* 4-note ascending tune; *wrong word* rubbery two-note drop; brick landing; first and second warning; collapse; brick break; streak success. Compare generated word notes to Web/PWA if convenient: especially that sound is not absent, clipping or overly loud. Test tower instability and collapse/frenzy bomb (if applicable) rather than only the first brick.
3. **Game/Speed menus:** Open/Close with many bricks falling, change belt speed and resume same tower, same score and word sequence. Test duplicate rapid clicks, keyboard Escape if used, help/back, intentional mute then unmute and Close. No sneaky resume before preflight.
4. **App Switcher:** During gameplay swipe up **and hold** (UIKit inactive though WebKit still visible), return, tap plain Welcome Back **Let's go**. Repeat full switch/lock. The tower physics and virtual clock must remain frozen until accepted; no fast-forward/duplicate rewards.
5. **YouTube PiP:** Test PAUSED YouTube video before return, then STILL PLAYING during return (with Let's go tapping to reclaim native priority), and fresh launch with PiP playing. Failure from genuine iOS denial stays a retriable plain Welcome Back and safe Back; no silent gray fatal trap or autoplay.
6. **Regression after Tower:** Go back Home and confirm sound; enter Versey Bird and revisit midpoint checkpoint if possible, plus Verse Munch, Invaders, Dino, Splat, Food, Snake, Bugs, Feeding (Classic/Labyrinth/Melody/Bounce), Learn and verse preview audio.
7. **If any problem:** BEFORE restarting, use DEV **Inspect native state** and **Copy Audio Timing Report**, report mode/event/verse, whether PiP is paused or still playing, iOS version, which speaker was audible and any Xcode error. A bridge `prepared:true` or `accepted:true` response is **not** acoustic proof.

### Acceptance and handoff

- New Node validator: `scripts/validate_native_tower_bible_n6j.js` is wired into the existing PR GitHub Actions workflow; all older 8-game/PiP regressions and production web build remain required.
- **Owner Mac Xcode Swift compile:** pending.
- **Owner actual iPhone audibility, game/recovery/checkpoint behavior:** pending.
- **After owner reports PASS and merges #51**, change current handoff from 8/12 to 9/12, keep full test evidence separate from assumptions, and take the next external game. PRs must always update `docs/PROJECT-HANDOFF.md`, `docs/TESTING.md`, `docs/AUDIO-RECOVERY.md` plus the game-specific guide.
