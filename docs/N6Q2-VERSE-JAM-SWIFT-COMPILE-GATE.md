# N6q.2 — Verse Jam Swift compiler syntax repair and first true iPhone build gate

> **Owner-reported build BLOCKER, not an iPhone audio PASS.** After personally merging [N6q.1 Verse Jam timing/recovery PR #60](https://github.com/andydoane/biblozoo/pull/60) into isolated `experiment/native-ios-audio` at `19eb6e68e8fee2582664429966ca343a66fb1eb1`, pulling via GitHub Desktop and attempting a physical iPhone Xcode build, the owner saw **four Xcode “Expected ';' separator” errors** in `ios/App/App/BibloZooNativeSoundPlugin.swift`. The run **never launched on iPhone**, so PR #60's five intended timing/recovery improvements are **NOT yet tested or accepted**. Previously reported [Verse Jam #58](https://github.com/andydoane/biblozoo/pull/58) faults remain OPEN. [Ghost Writer #59](https://github.com/andydoane/biblozoo/pull/59) is merged but still **not owner-tested**. 12/12 external standalone games and 3/5 Playground have owner PASS; all 5 Playground code slices are merged.

## Exactly what this PR repairs

The N6q.1 Swift source introduced expressions split across lines immediately after infix operators. Xcode reports grammar errors, not AVFoundation/PCM runtime failures. Four explicit locations, original behavior retained:

1. **Jam generated note envelope** — multiline `let decay = pow(0.0001,1.0/` followed by `Double(...)` now computes a named `fadeFrames` and a complete same-line `pow(..., 1.0 / fadeFrames)`.
2. **Jam chord-pad envelope** — same line-break failure with `pow(0.0001/0.016,1.0/`; use named `fadeFrames` and single syntactically complete math expression.
3. **Four triangle chord voices** — former trailing `+` in `return (triangle(freqs[0],t)+triangle(freqs[1],t)+` is now a named `chord` sum with continuation operator at the beginning of the next line, followed by `return chord * volume`.
4. **Host-clock lead time** — former trailing `-` after `($0-` now uses named `dueEpochMs` and `nowEpochMs`, calculating the same clamped 0–0.30 seconds.

These are **syntax-only / equivalent algebraic-expression changes**. Do not alter original Jam sources, seven BPM values, PCM voice limits, single serial AVAudioEngine/.soloAmbient priority, 100ms ahead beat clocks, JS menu/resume state, game scoring, score UI, Web/PWA/Android, Ghost Writer, child progress or stable `ios-prep`.

## Added safeguard and its limits

This PR adds a **real Swift compiler syntax parser step** to GitHub Actions for PRs/pushes targeting `experiment/native-ios-audio`:

```sh
swiftc -frontend -parse ios/App/App/BibloZooNativeSoundPlugin.swift
```

The Ubuntu GitHub-hosted image includes `swiftc`. `-frontend -parse` parses the **complete Swift file**, rather than just four source substrings, and doesn't need macOS UIKit/Capacitor frameworks to detect bad Swift grammar. **This is still NOT a full iOS compilation or type-check**: Xcode on the owner's Mac must compile and link the app with real Apple frameworks, and only the physical iPhone can establish audible timing. The existing separate **Node regression** and **Production web build** gates remain mandatory and must pass at the final PR commit.

## Owner device retest gate

After final HEAD CI both green, owner personally merges this small fix PR into **only** `experiment/native-ios-audio`, opens dedicated GitHub Desktop experiment checkout, **Pull origin**, then runs:

```sh
npm run build && npx cap sync ios && npx cap open ios
```

In Xcode choose **App** scheme and physical iPhone for independent `com.andydoane.biblozoo.audiotest` install. First **confirm Swift compile succeeds and app actually launches** with no red errors in `BibloZooNativeSoundPlugin.swift`. If further Xcode diagnostics occur, send the exact **first** error plus file/line and do not mark PASS.

Only **after** Xcode builds, execute the originally pending [N6q.1 owner 5-symptom Verse Jam hearing gate](N6Q1-VERSE-JAM-TIMING-FOLLOWUP.md): Get It latency following speed selection, on-beat first “Time”/“Speed” word tones, ending without spontaneous Welcome Back, responsive Great with uncut arpeggio, and genuine held App Switcher / full task switch / paused and playing YouTube PiP Let's go recovery without automatic priority steal or duplicate progress. Do not infer Ghost Writer PASS, a fifth Playground PASS, or any acoustic proof from parser/Node/web CI.

[Living handoff](PROJECT-HANDOFF.md) · [Testing](TESTING.md) · [Audio recovery](AUDIO-RECOVERY.md)
