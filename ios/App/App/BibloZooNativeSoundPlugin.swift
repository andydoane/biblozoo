import Foundation
import UIKit
import Capacitor
import AVFAudio

// N3b native-only iOS session owner: fixed predecoded PCM star/chomp plus
// six locally synthesized native peg tones with bounded overlapping voices.
// DEV pilot-unlock remains a native AVAudioPlayer control. No Web Audio or
// HTML fallback. Only an explicit Start/Resume/DEV tap may request a bounded
// setActive(true) retry AFTER a completed foreground return. This plugin never
// calls setCategory/setMode, deactivates, or automatically resumes sound.
// Three allowlisted MP3 resources are packaged; peg notes are Swift-generated PCM.
@objc(BibloZooNativeSoundPlugin)
final class BibloZooNativeSoundPlugin: CAPPlugin, CAPBridgedPlugin, AVAudioPlayerDelegate {
    public let identifier = "BibloZooNativeSoundPlugin"
    public let jsName = "BibloZooNativeSound"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "preload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "activateFromGesture", returnType: CAPPluginReturnPromise),
        // Read-only, bounded native session history; never activates audio.
        CAPPluginMethod(name: "getDebugState", returnType: CAPPluginReturnPromise),
        // N2.2 one-tap user-initiated diagnostics. No logging to disk/network.
        CAPPluginMethod(name: "copyTimingReport", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "markRecentChompLate", returnType: CAPPluginReturnPromise),
        // N5b.1 DEV-only long narration contract. Not wired to Learn UI yet.
        CAPPluginMethod(name: "prepareNarration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playNarration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseNarration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seekNarration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getNarrationState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopNarration", returnType: CAPPluginReturnPromise)
    ]

    // All MP3s are checked-in project assets explicitly copied into the
    // iOS app bundle. No URLs or caller-controlled filesystem paths.
    // C.1 prepares separate players: preloading feed-star cannot evict
    // feed-chomp or the already-verified pilot-unlock sample.
    private let soundResources: [String: String] = [
        "pilot-unlock": "ui_pet_unlock",
        "feed-star": "dq_feed_star",
        "feed-chomp": "dq_feed_chomp",
        "ui-pop-1": "ui_sound_pop_1",
        "ui-pop-2": "ui_sound_pop_2"
    ]
    // N6b fixed sound IDs map only to bundled Scripture Snake MP3 assets.
    private let snakeSoundResources: [String: String] = [
        "snake-correct": "verse_snake_correct",
        "snake-wrong": "verse_snake_wrong",
        "snake-fruit": "verse_snake_fruit",
        "snake-boost": "verse_snake_boost",
        "snake-bonus-start": "verse_snake_bonus_start",
        "snake-eat": "verse_snake_eat",
        "snake-bonus-result": "verse_snake_bonus_result"
    ]
    // N6c: fixed Bible Bugs MP3 sound inventory, decoded through the same
    // existing prewarmed worker AVAudioEngine; no caller-controlled paths.
    private let bibleBugsSoundResources: [String: String] = [
        "bugs-tongue": "bible_bugs_tongue",
        "bugs-pop-1": "bible_bugs_pop_1",
        "bugs-pop-2": "bible_bugs_pop_2",
        "bugs-pop-3": "bible_bugs_pop_3",
        "bugs-pop-4": "bible_bugs_pop_4",
        "bugs-pop-5": "bible_bugs_pop_5",
        "bugs-correct": "bible_bugs_correct",
        "bugs-incorrect": "bible_bugs_incorrect",
        "bugs-streak": "bible_bugs_streak",
        "bugs-bonus-start": "bible_bugs_bonus_start",
        "bugs-bonus-end": "bible_bugs_bonus_end",
        "bugs-stink-bug": "bible_bugs_stink_bug"
    ]
    // N6d: Food Slice fixed packaged MP3s. No caller-chosen filenames/URLs.
    private let foodSliceSoundResources: [String: String] = [
        "slice-bomb": "food_slice_bomb",
        "slice-wrong": "food_slice_wrong",
        "slice-cut-1": "food_slice_slice_1",
        "slice-cut-2": "food_slice_slice_2",
        "slice-cut-3": "food_slice_slice_3",
        "slice-cut-4": "food_slice_slice_4",
        "slice-cut-5": "food_slice_slice_5",
        "slice-swoosh-1": "food_slice_swoosh_1",
        "slice-swoosh-2": "food_slice_swoosh_2",
        "slice-swoosh-3": "food_slice_swoosh_3"
    ]
    // N6e fixed Verse Splat MP3 bank: ONLY shipped filenames, not JS paths.
    private let verseSplatSoundResources: [String: String] = [
        "splat-pop-1": "verse_splat_pop_1",
        "splat-pop-2": "verse_splat_pop_2",
        "splat-pop-3": "verse_splat_pop_3",
        "splat-pop-4": "verse_splat_pop_4",
        "splat-pop-5": "verse_splat_pop_5",
        "splat-correct-1": "verse_splat_correct_1",
        "splat-correct-2": "verse_splat_correct_2",
        "splat-correct-3": "verse_splat_correct_3",
        "splat-wrong": "verse_splat_wrong",
        "splat-streak": "verse_splat_streak",
        "splat-paint-score": "verse_splat_paint_score",
        "splat-start": "verse_splat_start",
        "splat-positive": "verse_splat_positive"
    ]
    // N6f Dino Dash: eight fixed, bundled game MP3 effects.
    // Same .soloAmbient session and serialized AVAudioEngine PCM worker.
    private let dinoDashSoundResources: [String: String] = [
        "dino-collision": "dino_dash_collision",
        "dino-correct": "dino_dash_correct",
        "dino-fall": "dino_dash_fall",
        "dino-finish": "dino_dash_finish",
        "dino-jump": "dino_dash_jump",
        "dino-jump2": "dino_dash_jump_2",
        "dino-streak": "dino_dash_streak",
        "dino-wrong": "dino_dash_wrong"
    ]
    // N6g Verse Invaders: 13 exact packaged MP3s; aliases share one PCM.
    private let verseInvadersSoundResources: [String: String] = [
        "inv-launch": "verse_invaders_launch",
        "inv-correct": "verse_invaders_correct",
        "inv-wrong": "verse_invaders_wrong",
        "inv-abduction": "verse_invaders_abduction",
        "inv-streak": "verse_invaders_streak",
        "inv-bonus-start": "verse_invaders_bonus_start",
        "inv-pop-1": "verse_invaders_pop_1",
        "inv-pop-2": "verse_invaders_pop_2",
        "inv-pop-3": "verse_invaders_pop_3",
        "inv-pop-4": "verse_invaders_pop_4",
        "inv-pop-5": "verse_invaders_pop_5",
        "inv-bonus-penalty": "verse_invaders_wrong_2",
        "inv-bonus-reveal": "verse_invaders_bonus_result"
    ]
    // Worker owns all players, PCM effect buffers, AVAudioPlayerNodes and
    // AVAudioEngine. Swift main queue owns AVAudioSession/session history only.
    // PCM decode + engine startup occur on an explicit Got It!/Resume/DEV
    // preload, NEVER on the hot collision-to-sound path.
    private let playbackQueue = DispatchQueue(
        label: "biblozoo.native-output.player", qos: .userInitiated
    )
    private let playbackEpochLock = NSLock()
    private var playbackEpoch = 0
    private var players: [String: AVAudioPlayer] = [:] // pilot-unlock only
    // N5b.1: long-form narration is an independent AVAudioPlayer, not a
    // short PCM effect. Exactly one fixed local DEV clip is permitted here;
    // no arbitrary URLs, paths or client-supplied verse IDs. Later N5b
    // slices will review a bundled verse manifest before wiring Learn.
    private let narrationSoundID = "learn-john-3-16"
    private let narrationResourceName = "john_3_16"
    // N5b.2: the Capacitor public folder is already an Xcode folder resource
    // and contains the production verse_audio and verse_data directories.
    // The on-device published manifest is the authority, never JS paths.
    private lazy var publishedLearnVerseIDs: Set<String> = {
        guard let url = Bundle.main.url(
            forResource: "verse_list", withExtension: "json",
            subdirectory: "public/verse_data"),
              let data = try? Data(contentsOf: url),
              let ids = try? JSONDecoder().decode([String].self, from: data)
        else { return [] }
        return Set(ids.filter {
            $0.count <= 80 &&
            $0.range(
                of: "^[0-9a-z]+(?:_[0-9a-z]+)*$",
                options: .regularExpression
            ) != nil
        })
    }()
    private var narrationCurrentSoundID: String?
    private var narrationPlayer: AVAudioPlayer? // main thread only
    private var narrationRequestId: Int? // opaque local ID, never a verse/profile
    private var narrationCompleted = false
    // Only these two fixed IDs use predecoded buffers. Unchanged native
    // AVAudioPlayer pet-unlock is a useful DEV A/B reference for latency.
    private let pcmEffectIDs: Set<String> = [
        "feed-star", "feed-chomp", "ui-pop-1", "ui-pop-2",
        "snake-correct", "snake-wrong", "snake-fruit", "snake-boost",
        "snake-bonus-start", "snake-eat", "snake-bonus-result",
        "bugs-tongue", "bugs-pop-1", "bugs-pop-2", "bugs-pop-3",
        "bugs-pop-4", "bugs-pop-5", "bugs-correct", "bugs-incorrect",
        "bugs-streak", "bugs-bonus-start", "bugs-bonus-end",
        "bugs-stink-bug",
        "slice-bomb", "slice-wrong",
        "slice-cut-1", "slice-cut-2", "slice-cut-3",
        "slice-cut-4", "slice-cut-5",
        "slice-swoosh-1", "slice-swoosh-2", "slice-swoosh-3",
        "splat-pop-1", "splat-pop-2", "splat-pop-3",
        "splat-pop-4", "splat-pop-5",
        "splat-correct-1", "splat-correct-2", "splat-correct-3",
        "splat-wrong", "splat-streak", "splat-paint-score",
        "splat-start", "splat-positive",
        "dino-collision", "dino-correct", "dino-fall", "dino-finish",
        "dino-jump", "dino-jump2", "dino-streak", "dino-wrong",
        "inv-launch", "inv-correct", "inv-wrong", "inv-abduction",
        "inv-streak", "inv-bonus-start",
        "inv-pop-1", "inv-pop-2", "inv-pop-3", "inv-pop-4", "inv-pop-5",
        "inv-bonus-penalty", "inv-bonus-reveal"
    ]
    private let nativeSnakeOrbSoundID = "snake-orb"
    private let snakeOrbMidiNotes: [Int] = [72, 74, 76, 79, 81, 84]
    private let snakeOrbVoiceLimit = 4
    private let nativePegSoundID = "feed-peg"
    private let nativeMelodySoundID = "feed-melody"
    // All current Melody tune MIDI notes fall in this bounded 55...83 bank.
    private let melodyMidiRange = 55...83
    private let melodyVoiceLimit = 6
    // Matches Classic's existing six-note Web oscillator scale. Never pass
    // raw frequencies/oscillator parameters through the Capacitor bridge.
    private let pegFrequencies: [Double] = [
        523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98
    ]
    private let sampleVoiceLimit = 2
    private let pegVoiceLimit = 4
    private var effectsEngine: AVAudioEngine? // playbackQueue only
    private var effectBuffers: [String: AVAudioPCMBuffer] = [:] // worker only
    private var pegToneBuffers: [Int: AVAudioPCMBuffer] = [:] // worker only
    private var melodyToneBuffers: [Int: AVAudioPCMBuffer] = [:] // worker only
    private var snakeOrbToneBuffers: [Int: AVAudioPCMBuffer] = [:] // worker only
    private var effectNodes: [String: [AVAudioPlayerNode]] = [:] // worker only
    private var nextEffectVoice: [String: Int] = [:] // worker only
    private let maximumEffectFrames: AVAudioFramePosition = 1_500_000
    // First cold launch now activates the session on the user's actual
    // Got It!/Resume/DEV tap instead of assuming "no interruption" means
    // an output session was already accepted by iOS.
    private var hasGestureActivatedSession = false
    private let maxPreflightEvents = 18
    private var preflightEvents: [[String: Any]] = []
    private var lastNativeBackend = "none"
    private var lastNativePrepareMs = -1
    private var lastNativePlayQueueMs = -1
    private var lastNativePlayCallMs = -1
    private var lastNativePlayedSoundId = "none"
    // Bounded in-memory diagnostics. No pet/profile/verse, media audio,
    // permissions, device identifiers or route names. Main thread only.
    private let maxSoundTimingEvents = 80
    private var soundTimingEvents: [[String: Any]] = []
    private var timingEventSequence = 0
    private var lateChompMarks = 0
    // Only a confirmed, current .began event blocks a fresh tap. iOS can
    // deliver delayed "wasSuspended" .began events on resume; those are
    // historical and must not latch the pilot into a permanent error.
    private var interrupted = false
    private var leftForegroundDuringInterruption = false
    private var returnedToForegroundDuringInterruption = false
    private var lastInterruptionSignal = "none"
    private var interruptionEventCount = 0
    private var beganEventCount = 0
    private var endedEventCount = 0
    private var suspendedEventCount = 0
    private var routeEventCount = 0
    private var lastInterruptionAt: Date?
    private var lastInterruptionReasonCode = -1
    private var lastInterruptionRawType = -1
    // Single authoritative native-output session state in this app. The older
    // Web-clock recovery bridge remains registered for compatibility but is
    // disabled in the .audiotest bundle; read-only diagnostics may also observe.
    private let createdAt = Date()
    private let maxTraceEvents = 28
    private var eventSequence = 0
    private var eventTrace: [[String: Any]] = []
    private var foregroundEpoch = 0
    private var wasOutsideForeground = false
    private var mediaResetCount = 0
    private var needsGestureAfterReset = false
    private var lastRouteReasonCode = -1
    private let minimumActivationInterval: TimeInterval = 4
    private let maximumActivationAttemptsPerForeground = 2
    private var lastActivationAt: Date?
    private var activationAttemptsThisForeground = 0
    private var activationAttemptsTotal = 0
    private var lastActivationResult = "none"
    private var observers: [NSObjectProtocol] = []

    public override func load() {
        super.load()
        let center = NotificationCenter.default
        // Stop immediately when leaving the foreground, never queue old
        // effects to resume after a task switch, phone call or route change.
        observers.append(center.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in self?.leftForeground() })
        observers.append(center.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.leftForeground()
            // Count at most two OS reactivation attempts between backgrounds.
            self?.activationAttemptsThisForeground = 0
            self?.lastActivationAt = nil
            self?.appendTrace("app-background")
        })
        observers.append(center.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in self?.returnedToForeground() })
        observers.append(center.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: .main
        ) { [weak self] note in self?.handleInterruption(note) })
        observers.append(center.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] note in
            guard let self = self else { return }
            self.routeEventCount += 1
            self.lastRouteReasonCode =
                (note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? NSNumber)?.intValue ?? -1
            self.forgetPlayback()
            self.appendTrace("route-changed")
        })
        observers.append(center.addObserver(
            forName: AVAudioSession.mediaServicesWereLostNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.forgetPlayback()
            self?.appendTrace("media-services-lost")
        })
        observers.append(center.addObserver(
            forName: AVAudioSession.mediaServicesWereResetNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            self.forgetPlayback()
            self.mediaResetCount += 1
            self.needsGestureAfterReset = true
            self.appendTrace("media-services-reset")
        })
        appendTrace("plugin-loaded")
    }

    deinit {
        for token in observers { NotificationCenter.default.removeObserver(token) }
    }

    // Fixed-schema in-memory trace. The only fields are event code, monotonic
    // sequence, elapsed time, public app lifecycle and numeric session codes.
    // Never include verse text, pet names, microphone data or device IDs.
    private func appendTrace(_ kind: String) {
        eventSequence += 1
        let appState: String
        switch UIApplication.shared.applicationState {
        case .active: appState = "active"
        case .inactive: appState = "inactive"
        case .background: appState = "background"
        @unknown default: appState = "unknown"
        }
        eventTrace.append([
            "seq": eventSequence,
            "kind": kind,
            "elapsedMs": max(0, Int(Date().timeIntervalSince(createdAt) * 1000)),
            "appState": appState,
            "foregroundEpoch": foregroundEpoch,
            "pending": interrupted,
            "reasonCode": lastInterruptionReasonCode
        ])
        if eventTrace.count > maxTraceEvents {
            eventTrace.removeFirst(eventTrace.count - maxTraceEvents)
        }
    }

    // Lifecycle callbacks immediately invalidate old queued effects. Work
    // already in flight is stopped by the serial worker, with no auto-replay.
    private func playbackEpochSnapshot() -> Int {
        playbackEpochLock.lock()
        defer { playbackEpochLock.unlock() }
        return playbackEpoch
    }

    private func isCurrentPlaybackEpoch(_ token: Int) -> Bool {
        playbackEpochLock.lock()
        defer { playbackEpochLock.unlock() }
        return playbackEpoch == token
    }

    // Cross-bridge wall-clock times are approximate: JavaScript Date.now()
    // and Swift Date share the device clock but may be affected by clock
    // adjustments. Invalid/skewed values are reported as -1, not a real
    // playback delay. Worker queue and play call time use monotonic uptime.
    private func safeAgeMs(_ newer: Double, _ older: Double?) -> Int {
        guard let older = older, older.isFinite, older > 0,
              newer.isFinite else { return -1 }
        let delta = newer - older
        return delta >= 0 && delta <= 60000 ? Int(delta) : -1
    }

    private func optionalEpochMs(_ call: CAPPluginCall, key: String) -> Double? {
        guard let value = call.getDouble(key), value.isFinite,
              value > 1_500_000_000_000, value < 4_000_000_000_000 else { return nil }
        return value
    }

    private func timingId(_ call: CAPPluginCall) -> String {
        guard let value = call.getString("eventId"),
              value.range(of: #"^(?:feed|dev)-[0-9]{1,10}$"#,
                          options: .regularExpression) != nil else {
            return "unlabeled"
        }
        return value
    }

    private func recordSoundTiming(_ event: [String: Any]) {
        timingEventSequence += 1
        var row = event
        row["seq"] = timingEventSequence
        row["markedLate"] = false
        // Internal only, for "Mark recent chomp late" within 60 seconds.
        row["recordedAtUptime"] = ProcessInfo.processInfo.systemUptime
        soundTimingEvents.append(row)
        if soundTimingEvents.count > maxSoundTimingEvents {
            soundTimingEvents.removeFirst(soundTimingEvents.count - maxSoundTimingEvents)
        }
    }


    // Bounded, fixed-schema, main-thread-only diagnostic history. Each item
    // comes from an actual native call resolution, with a validated sound ID
    // and a code-defined result. No verse/profile/mic/device content, no
    // disk/network upload and no audio operation from a debug read.
    private func resolvePreflight(_ call: CAPPluginCall,
                                  _ response: [String: Any],
                                  phase: String, soundId: String) {
        let outcome = response["reason"] as? String ?? "unknown"
        let duration = response["prepareMs"] as? Int ?? -1
        preflightEvents.append([
            "phase": phase, "soundId": soundId, "result": outcome,
            "success": (response["ready"] as? Bool == true) ||
                       (response["prepared"] as? Bool == true),
            "prepareMs": duration,
            "foregroundEpoch": foregroundEpoch,
            "pending": interrupted,
            "active": UIApplication.shared.applicationState == .active
        ])
        if preflightEvents.count > maxPreflightEvents {
            preflightEvents.removeFirst(preflightEvents.count - maxPreflightEvents)
        }
        call.resolve(response)
    }

    private func timingReportText() -> String {
        let appState = UIApplication.shared.applicationState == .active
            ? "active" : "not-active"
        var lines = [
            "BibloZoo Audio Test | N2.2 Native Timing Report",
            "Manually copied from DEV panel; no automatic upload.",
            "App state: \(appState); interruption pending: \(interrupted); " +
                "foreground epoch: \(foregroundEpoch); late chomp marks: \(lateChompMarks)",
            "Rows: \(soundTimingEvents.count) of max \(maxSoundTimingEvents) " +
                "(oldest first). -1 = unavailable/clock skew.",
            "Collision/JS/bridge deltas use device wall time; queue/play use monotonic uptime.",
            "Native dispatch = predecoded PCM scheduleBuffer() for star/chomp, " +
                "AVAudioPlayer.play() for pilot. NOT proof of speaker audibility.",
            "seq | event | sound | result | collision->JS | JS->bridge | " +
                "bridge->worker | worker call | collision->native dispatch | " +
                "marked late | backend"
        ]
        var slow = 0
        for row in soundTimingEvents {
            func number(_ key: String) -> Int { row[key] as? Int ?? -1 }
            func word(_ key: String) -> String { row[key] as? String ?? "unknown" }
            let latency = number("collisionToNativeDispatchMs")
            if latency >= 120 { slow += 1 }
            lines.append([
                String(number("seq")),
                word("eventId"),
                word("soundId"),
                word("result"),
                String(number("collisionToRequestMs")),
                String(number("bridgeMs")),
                String(number("queueMs")),
                String(number("playCallMs")),
                String(latency),
                (row["markedLate"] as? Bool == true) ? "YES" : "no",
                word("backend")
            ].joined(separator: " | "))
        }
        lines.insert("Native dispatch >=120 ms: \(slow) records (diagnostic threshold, " +
                     "not an audible-delay verdict).", at: 4)
        lines.append("")
        lines.append("Native first-tap preflight: \(preflightEvents.count) " +
                     "of max \(maxPreflightEvents) (oldest first).")
        lines.append("First gesture OS activation accepted: " +
                     (hasGestureActivatedSession ? "yes" : "no"))
        lines.append("phase | sound | result | accepted | prepareMs | " +
                     "foregroundEpoch | pending | appActive")
        for row in preflightEvents {
            func textValue(_ key: String) -> String {
                return row[key] as? String ?? "unknown"
            }
            func numberValue(_ key: String) -> Int {
                return row[key] as? Int ?? -1
            }
            func boolValue(_ key: String) -> String {
                return row[key] as? Bool == true ? "yes" : "no"
            }
            lines.append([
                textValue("phase"), textValue("soundId"),
                textValue("result"), boolValue("success"),
                String(numberValue("prepareMs")),
                String(numberValue("foregroundEpoch")),
                boolValue("pending"), boolValue("active")
            ].joined(separator: " | "))
        }
        lines.append("Preflight accepted does NOT prove speaker sound. " +
                     "If silent, copy this report BEFORE restarting the app.")
        return lines.joined(separator: "\n")
    }

    // Copy synchronously on the native main thread *after* the user's actual
    // button tap. WKWebView clipboard permission or lost JS gesture cannot
    // cause a misleading success message. Clipboard stays on the device
    // until the user explicitly pastes it into a chat.
    @objc func copyTimingReport(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["copied": false, "reason": "unavailable"]); return
            }
            guard UIApplication.shared.applicationState == .active else {
                call.resolve(["copied": false, "reason": "not-foreground"]); return
            }
            UIPasteboard.general.string = self.timingReportText()
            call.resolve(["copied": true, "count": self.soundTimingEvents.count,
                          "lateChompMarks": self.lateChompMarks])
        }
    }

    // Optional owner feedback, only if they can conveniently return to the
    // panel within one minute. Marks the newest chomp, never fabricates a
    // measured latency or alters playback. No personal content is stored.
    @objc func markRecentChompLate(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["marked": false, "reason": "unavailable"]); return
            }
            let now = ProcessInfo.processInfo.systemUptime
            guard let index = self.soundTimingEvents.lastIndex(where: {
                ($0["soundId"] as? String) == "feed-chomp"
            }), let stamped = self.soundTimingEvents[index]["recordedAtUptime"] as? Double,
                now - stamped <= 60, now - stamped >= 0 else {
                call.resolve(["marked": false, "reason": "no-recent-chomp"]); return
            }
            if self.soundTimingEvents[index]["markedLate"] as? Bool != true {
                self.soundTimingEvents[index]["markedLate"] = true
                self.lateChompMarks += 1
            }
            call.resolve(["marked": true,
                          "seq": self.soundTimingEvents[index]["seq"] ?? 0])
        }
    }

    // Worker-only graph reset. Never keep an AVAudioEngine or scheduled PCM
    // clip alive after background/interruption/route or media-services reset.
    // A new explicit gesture must preload and warm the engine again.
    private func discardEffectsOnWorker() {
        for nodes in effectNodes.values {
            for node in nodes { node.stop() }
        }
        effectsEngine?.stop()
        effectNodes.removeAll()
        nextEffectVoice.removeAll()
        effectBuffers.removeAll()
        pegToneBuffers.removeAll()
        melodyToneBuffers.removeAll()
        snakeOrbToneBuffers.removeAll()
        effectsEngine = nil
    }


    // N3b: bounded voice pools are constructed and warmed during explicit
    // Got It!/Resume/DEV preflight. All graph/node mutations stay serialized.
    // Collision callbacks only choose a prestarted voice and schedule memory.
    private func preparePCMEffectOnWorker(soundId: String, url: URL)
        -> (prepared: Bool, durationMs: Int, reason: String) {
        if let buffer = effectBuffers[soundId], effectsEngine?.isRunning == true,
           let nodes = effectNodes[soundId], nodes.count == sampleVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, Int(Double(buffer.frameLength) /
                              buffer.format.sampleRate * 1000), "prepared")
        }
        do {
            let file = try AVAudioFile(forReading: url)
            guard file.length > 0, file.length <= maximumEffectFrames else {
                return (false, 0, "effect-too-large-or-empty")
            }
            guard let buffer = AVAudioPCMBuffer(
                pcmFormat: file.processingFormat,
                frameCapacity: AVAudioFrameCount(file.length)) else {
                return (false, 0, "pcm-allocation-failed")
            }
            try file.read(into: buffer)
            guard buffer.frameLength > 0 else { return (false, 0, "pcm-empty") }
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<sampleVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: buffer.format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: buffer.frameLength)
                node.play() // warm, with NO audible buffer scheduled
            }
            effectsEngine = engine
            effectNodes[soundId] = nodes
            nextEffectVoice[soundId] = 0
            effectBuffers[soundId] = buffer
            return (true, Int(Double(buffer.frameLength) /
                              buffer.format.sampleRate * 1000), "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "pcm-decode-or-engine-start-failed")
        }
    }

    // Same sine-note pitches as the original Classic peg oscillator.
    // Generate all SIX envelopes exactly once, before the round begins.
    // 8ms attack, fade by 95ms, silent at 105ms; no Web Audio is ever used.
    private func preparePegTonesOnWorker()
        -> (prepared: Bool, durationMs: Int, reason: String) {
        if pegToneBuffers.count == pegFrequencies.count,
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[nativePegSoundID],
           nodes.count == pegVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, 105, "prepared")
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "tone-format-failed")
        }
        let frames = AVAudioFrameCount(ceil(format.sampleRate * 0.105))
        var buffers: [Int: AVAudioPCMBuffer] = [:]
        for (note, frequency) in pegFrequencies.enumerated() {
            guard let buffer = AVAudioPCMBuffer(
                pcmFormat: format, frameCapacity: frames),
                  let samples = buffer.floatChannelData?[0] else {
                return (false, 0, "tone-allocation-failed")
            }
            buffer.frameLength = frames
            for frame in 0..<Int(frames) {
                let t = Double(frame) / format.sampleRate
                // Bounded smooth attack/decay so repeated collisions click
                // less than hard-starting and abruptly cutting a sine.
                let envelope: Double
                if t < 0.008 {
                    envelope = t / 0.008
                } else if t < 0.095 {
                    envelope = (0.095 - t) / (0.095 - 0.008)
                } else {
                    envelope = 0
                }
                samples[frame] = Float(
                    sin(2 * Double.pi * frequency * t) * envelope)
            }
            buffers[note] = buffer
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<pegVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: frames)
                node.play() // silent until a real Classic peg collision
            }
            effectsEngine = engine
            effectNodes[nativePegSoundID] = nodes
            nextEffectVoice[nativePegSoundID] = 0
            pegToneBuffers = buffers
            return (true, 105, "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "tone-engine-start-failed")
        }
    }


    // N3d engine groundwork only; real Melody mode routing belongs to N4.
    // Precompute bounded triangle PCM notes under one explicit DEV gesture.
    private func prepareMelodyTonesOnWorker()
        -> (prepared: Bool, durationMs: Int, reason: String) {
        if melodyToneBuffers.count == melodyMidiRange.count,
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[nativeMelodySoundID],
           nodes.count == melodyVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, 220, "prepared")
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "melody-format-failed")
        }
        let frames = AVAudioFrameCount(ceil(format.sampleRate * 0.22))
        var buffers: [Int: AVAudioPCMBuffer] = [:]
        for midi in melodyMidiRange {
            guard let buffer = AVAudioPCMBuffer(
                pcmFormat: format, frameCapacity: frames),
                  let samples = buffer.floatChannelData?[0] else {
                return (false, 0, "melody-allocation-failed")
            }
            buffer.frameLength = frames
            let frequency = 440.0 * pow(2.0, Double(midi - 69) / 12.0)
            for frame in 0..<Int(frames) {
                let time = Double(frame) / format.sampleRate
                let phase = (frequency * time)
                    .truncatingRemainder(dividingBy: 1.0)
                let triangle = 1.0 - 4.0 * abs(phase - 0.5)
                // 12ms attack then fade to silence at 220ms, like Web Melody.
                let envelope: Double
                if time < 0.012 {
                    envelope = time / 0.012
                } else {
                    envelope = max(0.0, (0.22 - time) / (0.22 - 0.012))
                }
                samples[frame] = Float(triangle * envelope)
            }
            buffers[midi] = buffer
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<melodyVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: frames)
                node.play() // warm silently until a deliberate native note
            }
            effectsEngine = engine
            effectNodes[nativeMelodySoundID] = nodes
            nextEffectVoice[nativeMelodySoundID] = 0
            melodyToneBuffers = buffers
            return (true, 220, "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "melody-engine-start-failed")
        }
    }

    // N6b: precomputed six-note C5–C6 triangle orb bank. No Web Audio
    // oscillator or audio-engine start on a hot gameplay collision.
    private func prepareSnakeOrbTonesOnWorker()
        -> (prepared: Bool, durationMs: Int, reason: String) {
        if snakeOrbToneBuffers.count == snakeOrbMidiNotes.count,
           effectsEngine?.isRunning == true,
           let nodes = effectNodes[nativeSnakeOrbSoundID],
           nodes.count == snakeOrbVoiceLimit,
           nodes.allSatisfy({ $0.isPlaying }) {
            return (true, 180, "prepared")
        }
        guard let format = AVAudioFormat(
            standardFormatWithSampleRate: 44_100, channels: 1) else {
            return (false, 0, "snake-orb-format-failed")
        }
        let frames = AVAudioFrameCount(ceil(format.sampleRate * 0.18))
        var buffers: [Int: AVAudioPCMBuffer] = [:]
        for (index, midi) in snakeOrbMidiNotes.enumerated() {
            guard let buffer = AVAudioPCMBuffer(
                pcmFormat: format, frameCapacity: frames),
                  let samples = buffer.floatChannelData?[0] else {
                return (false, 0, "snake-orb-allocation-failed")
            }
            buffer.frameLength = frames
            let frequency = 440.0 * pow(2.0, Double(midi - 69) / 12.0)
            for frame in 0..<Int(frames) {
                let t = Double(frame) / format.sampleRate
                let phase = (frequency * t).truncatingRemainder(dividingBy: 1.0)
                let triangle = 1.0 - 4.0 * abs(phase - 0.5)
                let envelope: Double
                if t < 0.012 {
                    envelope = t / 0.012
                } else {
                    envelope = max(0.0, (0.18 - t) / (0.18 - 0.012))
                }
                samples[frame] = Float(triangle * envelope)
            }
            buffers[index] = buffer
        }
        do {
            let engine = effectsEngine ?? AVAudioEngine()
            var nodes: [AVAudioPlayerNode] = []
            for _ in 0..<snakeOrbVoiceLimit {
                let node = AVAudioPlayerNode()
                engine.attach(node)
                engine.connect(node, to: engine.mainMixerNode, format: format)
                nodes.append(node)
            }
            if !engine.isRunning { try engine.start() }
            for node in nodes {
                node.prepare(withFrameCount: frames)
                node.play() // no sample is scheduled yet
            }
            effectsEngine = engine
            effectNodes[nativeSnakeOrbSoundID] = nodes
            nextEffectVoice[nativeSnakeOrbSoundID] = 0
            snakeOrbToneBuffers = buffers
            return (true, 180, "prepared")
        } catch {
            discardEffectsOnWorker()
            return (false, 0, "snake-orb-engine-failed")
        }
    }

    private func nextWarmVoiceOnWorker(soundId: String) -> AVAudioPlayerNode? {
        guard let nodes = effectNodes[soundId], !nodes.isEmpty else { return nil }
        let index = (nextEffectVoice[soundId] ?? 0) % nodes.count
        nextEffectVoice[soundId] = (index + 1) % nodes.count
        return nodes[index]
    }

    private func forgetPlayback() {
        // Stop long narration immediately with UIKit inactivity/interruptions;
        // invalidate the request before an old player completion can fire.
        stopNarrationPlayer(reason: "interrupted")
        playbackEpochLock.lock()
        playbackEpoch &+= 1
        playbackEpochLock.unlock()
        playbackQueue.async { [weak self] in
            guard let self = self else { return }
            for sound in self.players.values { sound.stop() }
            self.players.removeAll()
            self.discardEffectsOnWorker()
        }
    }

    private func leftForeground() {
        forgetPlayback()
        if !wasOutsideForeground {
            wasOutsideForeground = true
            appendTrace("app-left-active")
            // N4a.1: opening the iOS app-switcher makes the app INACTIVE
            // without necessarily hiding WKWebView or firing pagehide.
            // JS must freeze its physics/song clock before another catch.
            // This event is state only: never unlock/restart sound.
            notifyListeners("biblozooAppLifecycle", data: [
                "active": false,
                "foregroundEpoch": foregroundEpoch
            ])
        }
        if interrupted { leftForegroundDuringInterruption = true }
    }

    private func returnedToForeground() {
        // Foreground is evidence of a lifecycle transition, NOT audio health.
        // A new explicit tap may now ask the OS to activate; this method
        // never clears a pending interruption and never starts playback.
        if wasOutsideForeground {
            wasOutsideForeground = false
            foregroundEpoch += 1
            if interrupted && leftForegroundDuringInterruption {
                returnedToForegroundDuringInterruption = true
            }
        }
        appendTrace("app-active")
        // If an inactive event was held while WebKit was suspended, the
        // matching return event also forces the JS game to pause. Only a
        // later real Welcome Back tap is permitted to re-preload sounds.
        notifyListeners("biblozooAppLifecycle", data: [
            "active": true,
            "foregroundEpoch": foregroundEpoch
        ])
    }

    private func handleInterruption(_ note: Notification) {
        forgetPlayback()
        // Counters are in-memory only, exposed on explicit developer taps.
        // Never log verse text, profiles, recordings or device identifiers.
        interruptionEventCount += 1
        lastInterruptionAt = Date()
        lastInterruptionRawType =
            (note.userInfo?[AVAudioSessionInterruptionTypeKey] as? NSNumber)?.intValue ?? -1
        lastInterruptionReasonCode =
            (note.userInfo?[AVAudioSessionInterruptionReasonKey] as? NSNumber)?.intValue ?? -1
        guard let raw = (note.userInfo?[AVAudioSessionInterruptionTypeKey] as? NSNumber)?.uintValue,
              let kind = AVAudioSession.InterruptionType(rawValue: raw) else {
            // An absent/unrecognized type is not evidence of a fresh .began.
            lastInterruptionSignal = "unrecognized"
            appendTrace("interruption-unrecognized")
            return
        }
        switch kind {
        case .began:
            beganEventCount += 1
            let wasSuspended =
                (note.userInfo?[AVAudioSessionInterruptionWasSuspendedKey] as? NSNumber)?.boolValue == true
            if wasSuspended {
                suspendedEventCount += 1
                // iOS 10+: delayed message saying the session was deactivated
                // WHEN THE PROCESS WAS SUSPENDED. Ignore it as a fresh active
                // interruption; keep an unrelated earlier pending .began intact.
                lastInterruptionSignal = "suspended-began"
                appendTrace("interruption-suspended-history")
                return
            }
            interrupted = true
            leftForegroundDuringInterruption =
                UIApplication.shared.applicationState != .active
            returnedToForegroundDuringInterruption = false
            lastInterruptionSignal = "began"
            appendTrace("interruption-began")
        case .ended:
            endedEventCount += 1
            interrupted = false
            leftForegroundDuringInterruption = false
            returnedToForegroundDuringInterruption = false
            lastInterruptionSignal = "ended"
            appendTrace("interruption-ended")
        @unknown default:
            lastInterruptionSignal = "unrecognized"
            appendTrace("interruption-unrecognized")
        }
    }

    private func onMain(_ work: @escaping () -> Void) {
        if Thread.isMainThread { work() }
        else { DispatchQueue.main.async(execute: work) }
    }

    private func unavailableReason() -> String? {
        if UIApplication.shared.applicationState != .active { return "not-foreground" }
        if AVAudioSession.sharedInstance().category != .soloAmbient {
            return "category-not-soloambient"
        }
        // Never clear a genuine .began merely because the app became active.
        // See activateFromGesture: a bounded OS decision is required after a
        // full inactive->active transition, or wait for a real .ended event.
        if interrupted { return "interruption-pending" }
        if needsGestureAfterReset { return "media-reset-requires-gesture" }
        return nil
    }

    // The ONLY native audio-session activation entrypoint in the .audiotest
    // app. Called explicitly from Got It!/Resume or a DEV sound tap; no
    // foreground observer, status inspection or queued effect invokes this.
    @objc func activateFromGesture(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["ready": false, "reason": "unavailable"]); return
            }
            func finish(_ result: [String: Any]) {
                self.resolvePreflight(call, result, phase: "gesture",
                                      soundId: "session")
            }
            let purpose = call.getString("purpose") ?? ""
            guard purpose == "dev" || purpose == "feeding" || purpose == "ui" ||
                  purpose == "learn" || purpose == "game" else {
                finish(["ready": false, "reason": "invalid-purpose"]); return
            }
            if let blocked = self.unavailableReason(), blocked != "interruption-pending",
               blocked != "media-reset-requires-gesture" {
                self.lastActivationResult = blocked
                self.appendTrace("activation-denied")
                finish(["ready": false, "reason": blocked]); return
            }
            let firstTap = !self.hasGestureActivatedSession
            let needsRecovery = firstTap || self.interrupted ||
                self.needsGestureAfterReset
            if !needsRecovery {
                self.lastActivationResult = "not-needed"
                self.appendTrace("activation-not-needed")
                finish(["ready": true, "attempted": false, "reason": "not-needed"])
                return
            }
            // A real pending .began remains protected until either iOS sends
            // .ended OR the app has fully left/returned and the child taps.
            guard !self.interrupted || self.returnedToForegroundDuringInterruption else {
                self.lastActivationResult = "interruption-pending"
                self.appendTrace("activation-deferred")
                finish(["ready": false, "attempted": false,
                              "reason": "interruption-pending"])
                return
            }
            let now = Date()
            if let last = self.lastActivationAt,
               now.timeIntervalSince(last) < self.minimumActivationInterval {
                self.lastActivationResult = "activation-cooldown"
                self.appendTrace("activation-deferred")
                finish(["ready": false, "attempted": false,
                              "reason": "activation-cooldown"])
                return
            }
            guard self.activationAttemptsThisForeground <
                    self.maximumActivationAttemptsPerForeground else {
                self.lastActivationResult = "foreground-attempt-limit"
                self.appendTrace("activation-deferred")
                finish(["ready": false, "attempted": false,
                              "reason": "foreground-attempt-limit"])
                return
            }
            self.lastActivationAt = now
            self.activationAttemptsThisForeground += 1
            self.activationAttemptsTotal += 1
            do {
                // This is OS acceptance only, not speaker audibility. Category
                // and mode are never changed, even after media-services reset.
                try AVAudioSession.sharedInstance().setActive(true)
                self.interrupted = false
                self.needsGestureAfterReset = false
                self.hasGestureActivatedSession = true
                self.leftForegroundDuringInterruption = false
                self.returnedToForegroundDuringInterruption = false
                self.lastInterruptionSignal = firstTap
                    ? "initial-activation-accepted"
                    : "foreground-activation-accepted"
                self.lastActivationResult = "os-accepted"
                self.appendTrace("activation-os-accepted")
                finish(["ready": true, "attempted": true,
                              "reason": "os-accepted", "backend": "avfoundation"])
            } catch let error as NSError {
                // Never clear pending state or claim sound output on failure.
                self.lastActivationResult = "activation-os-rejected"
                self.appendTrace("activation-os-rejected")
                finish(["ready": false, "attempted": true,
                              "reason": "activation-os-rejected",
                              "errorDomain": error.domain, "errorCode": error.code])
            }
        }
    }

    private func requestedId(_ call: CAPPluginCall) -> String? {
        guard let soundId = call.getString("soundId"),
              soundResources[soundId] != nil ||
              snakeSoundResources[soundId] != nil ||
              bibleBugsSoundResources[soundId] != nil ||
              foodSliceSoundResources[soundId] != nil ||
              verseSplatSoundResources[soundId] != nil ||
              dinoDashSoundResources[soundId] != nil ||
              verseInvadersSoundResources[soundId] != nil ||
              soundId == nativeSnakeOrbSoundID ||
              soundId == nativePegSoundID ||
              soundId == nativeMelodySoundID else { return nil }
        return soundId
    }

    // No audio API is invoked here. This snapshot describes notification
    // history, not whether the speaker was audible or AVAudioSession is active
    // (Apple exposes no public isActive property).
    @objc func getDebugState(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["available": false])
                return
            }
            let state: String
            switch UIApplication.shared.applicationState {
            case .active: state = "active"
            case .inactive: state = "inactive"
            case .background: state = "background"
            @unknown default: state = "unknown"
            }
            let ageMs = self.lastInterruptionAt.map {
                max(0, Int(Date().timeIntervalSince($0) * 1000))
            } ?? -1
            call.resolve([
                "available": true,
                "appState": state,
                "category": AVAudioSession.sharedInstance().category.rawValue,
                "pending": self.interrupted,
                "lastSignal": self.lastInterruptionSignal,
                "eventCount": self.interruptionEventCount,
                "beganCount": self.beganEventCount,
                "endedCount": self.endedEventCount,
                "suspendedCount": self.suspendedEventCount,
                "routeCount": self.routeEventCount,
                "lastReasonCode": self.lastInterruptionReasonCode,
                "lastRawType": self.lastInterruptionRawType,
                "lastAgeMs": ageMs,
                "foregroundEpoch": self.foregroundEpoch,
                "eventSequence": self.eventSequence,
                "recentEvents": self.eventTrace,
                "mediaResetCount": self.mediaResetCount,
                "needsGestureAfterReset": self.needsGestureAfterReset,
                "lastRouteReasonCode": self.lastRouteReasonCode,
                "activationAttemptsThisForeground": self.activationAttemptsThisForeground,
                "activationAttemptsTotal": self.activationAttemptsTotal,
                "lastActivationResult": self.lastActivationResult,
                "hasGestureActivatedSession": self.hasGestureActivatedSession,
                "preflightEventCount": self.preflightEvents.count,
                "lastPreflight": self.preflightEvents.last ?? [:],
                "lastNativePrepareMs": self.lastNativePrepareMs,
                "lastNativePlayQueueMs": self.lastNativePlayQueueMs,
                "lastNativePlayCallMs": self.lastNativePlayCallMs,
                "lastNativePlayedSoundId": self.lastNativePlayedSoundId,
                "lastNativeBackend": self.lastNativeBackend,
                "timingEventCount": self.soundTimingEvents.count,
                "lateChompMarks": self.lateChompMarks
            ])
        }
    }


    // Guard native session on main; schedule ALL potentially synchronous
    // AVAudioPlayer operations on the dedicated serial queue. No Web fallback.
    @objc func preload(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["prepared": false, "reason": "unavailable"])
                return
            }
            func finish(_ result: [String: Any]) {
                self.resolvePreflight(call, result, phase: "preload",
                    soundId: self.requestedId(call) ?? "invalid")
            }
            guard let soundId = self.requestedId(call) else {
                finish(["prepared": false, "reason": "invalid-sound-id"])
                return
            }
            if let reason = self.unavailableReason() {
                finish(["prepared": false, "reason": reason])
                return
            }
            let url: URL?
            if soundId == self.nativePegSoundID ||
               soundId == self.nativeMelodySoundID ||
               soundId == self.nativeSnakeOrbSoundID {
                // Fixed Swift-generated PCM banks, never downloaded assets.
                url = nil
            } else if let resourceName = self.snakeSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/verse_snake/verse_snake_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.bibleBugsSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/bible_bugs/bible_bugs_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.verseInvadersSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/verse_invaders/verse_invaders_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.dinoDashSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/dino_dash/dino_dash_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.verseSplatSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/verse_splat/verse_splat_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.foodSliceSoundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3",
                    subdirectory: "public/verse_games/foodslice/food_slice_sounds") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else if let resourceName = self.soundResources[soundId] {
                guard let bundledURL = Bundle.main.url(
                    forResource: resourceName, withExtension: "mp3") else {
                    finish(["prepared": false, "reason": "bundled-asset-missing"])
                    return
                }
                url = bundledURL
            } else {
                finish(["prepared": false, "reason": "invalid-sound-id"])
                return
            }
            let epoch = self.playbackEpochSnapshot()
            self.playbackQueue.async { [weak self] in
                guard let self = self else {
                    DispatchQueue.main.async {
                        finish(["prepared": false, "reason": "unavailable"])
                    }
                    return
                }
                guard self.isCurrentPlaybackEpoch(epoch) else {
                    DispatchQueue.main.async {
                        finish(["prepared": false, "reason": "stale"])
                    }
                    return
                }
                let startedAt = ProcessInfo.processInfo.systemUptime
                var prepared = false
                var durationMs = 0
                var failed = "prepare-failed"
                let backend: String
                if soundId == self.nativeSnakeOrbSoundID {
                    let result = self.prepareSnakeOrbTonesOnWorker()
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-snake-orb"
                } else if soundId == self.nativePegSoundID {
                    let result = self.preparePegTonesOnWorker()
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-tone"
                } else if soundId == self.nativeMelodySoundID {
                    let result = self.prepareMelodyTonesOnWorker()
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-melody"
                } else if self.pcmEffectIDs.contains(soundId), let url = url {
                    // MP3 decoding ONLY happens during explicit preflight.
                    let result = self.preparePCMEffectOnWorker(
                        soundId: soundId, url: url)
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-pcm"
                } else if let url = url {
                    // DEV pet-unlock comparison stays native AVAudioPlayer.
                    self.players.removeValue(forKey: soundId)?.stop()
                    do {
                        let player = try AVAudioPlayer(contentsOf: url)
                        player.numberOfLoops = 0
                        if player.prepareToPlay() {
                            prepared = true
                            durationMs = Int(player.duration * 1000)
                            if self.isCurrentPlaybackEpoch(epoch) {
                                self.players[soundId] = player
                            } else {
                                prepared = false
                                player.stop()
                            }
                        }
                    } catch { failed = "decode-error" }
                    backend = "avfoundation-player"
                } else {
                    backend = "unavailable"
                }
                let prepareMs = max(0, Int(
                    (ProcessInfo.processInfo.systemUptime - startedAt) * 1000))
                DispatchQueue.main.async { [weak self] in
                    guard let self = self else {
                        finish(["prepared": false, "reason": "unavailable"])
                        return
                    }
                    guard self.isCurrentPlaybackEpoch(epoch) else {
                        finish(["prepared": false, "reason": "stale"])
                        return
                    }
                    if let reason = self.unavailableReason() {
                        finish(["prepared": false, "reason": reason])
                        return
                    }
                    self.lastNativePrepareMs = prepareMs
                    guard prepared else {
                        finish(["prepared": false, "reason": failed])
                        return
                    }
                    // Prepared engine/player is NOT human-audible proof.
                    finish([
                        "prepared": true,
                        "reason": "prepared",
                        "backend": backend,
                        "lastInterruptionSignal": self.lastInterruptionSignal,
                        "foregroundEpoch": self.foregroundEpoch,
                        "durationMs": durationMs,
                        "prepareMs": prepareMs
                    ])
                }
            }
        }
    }

    @objc func play(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["accepted": false, "reason": "unavailable"])
                return
            }
            guard let soundId = self.requestedId(call) else {
                call.resolve(["accepted": false, "reason": "invalid-sound-id"])
                return
            }
            guard let volume = call.getDouble("volume"), volume.isFinite,
                  volume >= 0, volume <= 1 else {
                call.resolve(["accepted": false, "reason": "invalid-volume"])
                return
            }
            let requestedNoteIndex: Int?
            if soundId == self.nativePegSoundID ||
               soundId == self.nativeSnakeOrbSoundID {
                let count = soundId == self.nativeSnakeOrbSoundID
                    ? self.snakeOrbMidiNotes.count : self.pegFrequencies.count
                guard let noteIndex = call.getInt("noteIndex"),
                      (0..<count).contains(noteIndex) else {
                    call.resolve(["accepted": false, "reason": "invalid-peg-note"])
                    return
                }
                requestedNoteIndex = noteIndex
            } else {
                requestedNoteIndex = nil
            }
            let requestedMidi: Int?
            if soundId == self.nativeMelodySoundID {
                guard let midi = call.getInt("midi"),
                      self.melodyMidiRange.contains(midi) else {
                    call.resolve(["accepted": false,
                                  "reason": "invalid-melody-midi"])
                    return
                }
                requestedMidi = midi
            } else {
                requestedMidi = nil
            }
            if let reason = self.unavailableReason() {
                self.forgetPlayback()
                call.resolve(["accepted": false, "reason": reason])
                return
            }
            let epoch = self.playbackEpochSnapshot()
            let enqueuedAt = ProcessInfo.processInfo.systemUptime
            let receivedAtEpochMs = Date().timeIntervalSince1970 * 1000
            let collisionAt = self.optionalEpochMs(call, key: "collisionEpochMs")
            let requestedAt = self.optionalEpochMs(call, key: "requestEpochMs")
            let eventId = self.timingId(call)
            let bridgeMs = self.safeAgeMs(receivedAtEpochMs, requestedAt)
            let collisionToRequestMs = self.safeAgeMs(
                requestedAt ?? -1, collisionAt)
            self.playbackQueue.async { [weak self] in
                guard let self = self else {
                    DispatchQueue.main.async {
                        call.resolve(["accepted": false, "reason": "unavailable"])
                    }
                    return
                }
                guard self.isCurrentPlaybackEpoch(epoch) else {
                    DispatchQueue.main.async {
                        call.resolve(["accepted": false, "reason": "stale"])
                    }
                    return
                }
                let startedAt = ProcessInfo.processInfo.systemUptime
                let queueMs = max(0, Int((startedAt - enqueuedAt) * 1000))
                let started: Bool
                let durationMs: Int
                let backend: String
                let resultReason: String
                if self.pcmEffectIDs.contains(soundId) ||
                   soundId == self.nativeSnakeOrbSoundID ||
                   soundId == self.nativePegSoundID ||
                   soundId == self.nativeMelodySoundID {
                    // One hot path for sample and note voice pools: choose a
                    // prestarted node and schedule only an in-memory buffer.
                    // No decode, allocation, engine start or Web fallback.
                    guard let engine = self.effectsEngine, engine.isRunning,
                          let nodes = self.effectNodes[soundId], !nodes.isEmpty,
                          nodes.allSatisfy({ $0.isPlaying }) else {
                        DispatchQueue.main.async {
                            call.resolve(["accepted": false,
                                          "reason": "pcm-not-preloaded"])
                        }
                        return
                    }
                    let buffer: AVAudioPCMBuffer?
                    if soundId == self.nativeSnakeOrbSoundID {
                        buffer = self.snakeOrbToneBuffers[requestedNoteIndex ?? -1]
                    } else if soundId == self.nativePegSoundID {
                        buffer = self.pegToneBuffers[requestedNoteIndex ?? -1]
                    } else if soundId == self.nativeMelodySoundID {
                        buffer = self.melodyToneBuffers[requestedMidi ?? -1]
                    } else {
                        buffer = self.effectBuffers[soundId]
                    }
                    guard let readyBuffer = buffer,
                          let node = self.nextWarmVoiceOnWorker(soundId: soundId) else {
                        DispatchQueue.main.async {
                            call.resolve(["accepted": false,
                                          "reason": "pcm-not-preloaded"])
                        }
                        return
                    }
                    node.volume = Float(volume)
                    // A reused voice interrupts its old buffer; distinct
                    // voices keep a small bounded number of overlaps.
                    node.scheduleBuffer(readyBuffer, at: nil,
                                        options: [.interrupts],
                                        completionHandler: nil)
                    started = true // scheduled only, not speaker confirmation
                    durationMs = Int(Double(readyBuffer.frameLength) /
                                     readyBuffer.format.sampleRate * 1000)
                    backend = soundId == self.nativePegSoundID
                        ? "avengine-tone"
                        : (soundId == self.nativeMelodySoundID
                            ? "avengine-melody" : (soundId == self.nativeSnakeOrbSoundID
                                ? "avengine-snake-orb" : "avengine-pcm"))
                    resultReason = "scheduled"
                } else {
                    guard let sound = self.players[soundId] else {
                        DispatchQueue.main.async {
                            call.resolve(["accepted": false,
                                          "reason": "not-preloaded"])
                        }
                        return
                    }
                    // Pilot unlock remains the independent native player
                    // reference case; do not regress its existing DEV sound.
                    sound.currentTime = 0
                    sound.volume = Float(volume)
                    started = sound.play()
                    durationMs = Int(sound.duration * 1000)
                    backend = "avfoundation-player"
                    resultReason = started ? "started" : "play-denied"
                }
                let nativeDispatchEpochMs = Date().timeIntervalSince1970 * 1000
                let playCallMs = max(0, Int(
                    (ProcessInfo.processInfo.systemUptime - startedAt) * 1000))
                let collisionToNativeDispatchMs =
                    self.safeAgeMs(nativeDispatchEpochMs, collisionAt)
                DispatchQueue.main.async { [weak self] in
                    guard let self = self else {
                        call.resolve(["accepted": false, "reason": "unavailable"])
                        return
                    }
                    guard self.isCurrentPlaybackEpoch(epoch) else {
                        call.resolve(["accepted": false, "reason": "stale"])
                        return
                    }
                    self.lastNativePlayedSoundId = soundId
                    self.lastNativePlayQueueMs = queueMs
                    self.lastNativePlayCallMs = playCallMs
                    self.lastNativeBackend = backend
                    self.recordSoundTiming([
                        "eventId": eventId, "soundId": soundId,
                        "result": resultReason, "backend": backend,
                        "collisionToRequestMs": collisionToRequestMs,
                        "bridgeMs": bridgeMs, "queueMs": queueMs,
                        "playCallMs": playCallMs,
                        "collisionToNativeDispatchMs": collisionToNativeDispatchMs
                    ])
                    // Native scheduling/player request is NOT acoustic proof.
                    call.resolve([
                        "accepted": started,
                        "reason": resultReason,
                        "backend": backend,
                        "durationMs": durationMs,
                        "queueMs": queueMs,
                        "playCallMs": playCallMs
                    ])
                }
            }
        }
    }


    @objc func stop(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["stopped": false, "reason": "unavailable"])
                return
            }
            guard let soundId = self.requestedId(call) else {
                call.resolve(["stopped": false, "reason": "invalid-sound-id"])
                return
            }
            self.playbackQueue.async { [weak self] in
                guard let self = self else {
                    DispatchQueue.main.async {
                        call.resolve(["stopped": false, "reason": "unavailable"])
                    }
                    return
                }
                if self.pcmEffectIDs.contains(soundId) ||
                   soundId == self.nativeSnakeOrbSoundID ||
                   soundId == self.nativePegSoundID ||
                   soundId == self.nativeMelodySoundID {
                    // A paused/exited round tears down all prepared effect
                    // voices; the next Got It!/Resume must explicitly warm.
                    self.discardEffectsOnWorker()
                } else {
                    self.players.removeValue(forKey: soundId)?.stop()
                }
                DispatchQueue.main.async {
                    call.resolve(["stopped": true, "reason": "stopped"])
                }
            }
        }
    }

    // N5b.2 keeps DEV John 3:16 and adds only published local Learn
    // reference/full-verse files from the existing Capacitor public folder.
    // Do not accept caller-controlled URLs, arbitrary paths, chunks or Echo.
    private func nativeNarrationURL(for soundId: String) -> URL? {
        if soundId == narrationSoundID {
            return Bundle.main.url(
                forResource: narrationResourceName, withExtension: "mp3")
        }
        // Short Learn instruction prompts are static, application-owned
        // files. The JS caller only supplies a fixed allowlisted key.
        let instructions: [String: String] = [
            "listen": "instructions_listen",
            "meaning": "instructions_meaning",
            "chunks1": "instructions_chunks1",
            "chunks2": "instructions_chunks2",
            "echo1": "instructions_echo1",
            "echo_start": "instructions_echo_start",
            "remove": "instructions_remove",
            "final": "instructions_final",
            "games": "instructions_games"
        ]
        if soundId.hasPrefix("learn-instruction-") {
            let key = String(soundId.dropFirst("learn-instruction-".count))
            guard let filename = instructions[key] else { return nil }
            return Bundle.main.url(
                forResource: filename, withExtension: "mp3",
                subdirectory: "public/verse_audio")
        }

        let reference = soundId.hasPrefix("learn-ref-")
        let verse = soundId.hasPrefix("learn-verse-")
        let chunk = soundId.hasPrefix("learn-part-")
        guard reference || verse || chunk else { return nil }

        let verseId: String
        var chunkIndex: Int? = nil
        if chunk {
            let encoded = String(soundId.dropFirst("learn-part-".count))
            guard let separator = encoded.lastIndex(of: "-"),
                  let index = Int(encoded[encoded.index(after: separator)...]),
                  index >= 0, index <= 26 else { return nil }
            verseId = String(encoded[..<separator])
            chunkIndex = index
        } else {
            let prefix = reference ? "learn-ref-" : "learn-verse-"
            verseId = String(soundId.dropFirst(prefix.count))
        }

        guard publishedLearnVerseIDs.contains(verseId),
              let jsonURL = Bundle.main.url(
                forResource: verseId, withExtension: "json",
                subdirectory: "public/verse_data"),
              let data = try? Data(contentsOf: jsonURL),
              let json = (try? JSONSerialization.jsonObject(with: data))
                as? [String: Any],
              json["published"] as? Bool == true,
              json["verseId"] as? String == verseId else { return nil }

        let file: String
        if let index = chunkIndex {
            let parts = json["echoParts"] as? [String] ?? []
            let maximumPart = parts.isEmpty ? 1 : parts.count
            guard index <= maximumPart else { return nil }
            if index == 0 {
                file = verseId + "_ref"
            } else if parts.isEmpty {
                file = verseId
            } else {
                let ascii = 96 + index
                guard let suffix = UnicodeScalar(ascii) else { return nil }
                file = verseId + String(Character(suffix))
            }
        } else {
            file = verseId + (reference ? "_ref" : "")
        }
        return Bundle.main.url(
            forResource: file, withExtension: "mp3",
            subdirectory: "public/verse_audio")
    }

    // N5b.1: One fixed packaged John 3:16 narrator proves the long-form
    // player contract before touching child-facing Learn progress. All
    // methods execute on main, matching AVAudioPlayerDelegate's run loop.
    // These outcomes are player state, never proof of speaker audibility.
    private func stopNarrationPlayer(reason: String? = nil) {
        let oldId = narrationRequestId
        narrationPlayer?.delegate = nil
        narrationPlayer?.stop()
        narrationPlayer = nil
        narrationRequestId = nil
        narrationCurrentSoundID = nil
        narrationCompleted = false
        if let reason = reason, let oldId = oldId {
            notifyListeners("biblozooNarration", data: [
                "type": "invalidated",
                "requestId": oldId,
                "reason": reason
            ])
        }
    }

    private func narrationSnapshot() -> [String: Any] {
        guard let player = narrationPlayer,
              let requestId = narrationRequestId else {
            return ["prepared": false, "playing": false,
                    "ended": false, "positionMs": 0, "durationMs": 0]
        }
        let durationMs = max(0, Int(player.duration * 1000))
        let positionMs = max(0, min(durationMs, Int(player.currentTime * 1000)))
        return [
            "prepared": true,
            "soundId": narrationCurrentSoundID ?? narrationSoundID,
            "requestId": requestId,
            "playing": player.isPlaying,
            "ended": narrationCompleted,
            "positionMs": positionMs,
            "durationMs": durationMs,
            "foregroundEpoch": foregroundEpoch
        ]
    }

    @objc func prepareNarration(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["prepared": false, "reason": "unavailable"]); return
            }
            guard let soundId = call.getString("soundId"),
                  let requestId = call.getInt("requestId"),
                  requestId > 0 else {
                call.resolve(["prepared": false, "reason": "invalid-request"]); return
            }
            if let reason = self.unavailableReason() {
                call.resolve(["prepared": false, "reason": reason]); return
            }
            guard let url = self.nativeNarrationURL(for: soundId) else {
                call.resolve(["prepared": false, "reason": "not-published-or-missing"])
                return
            }
            self.stopNarrationPlayer()
            do {
                let player = try AVAudioPlayer(contentsOf: url)
                player.delegate = self
                player.numberOfLoops = 0
                guard player.prepareToPlay(), player.duration > 0 else {
                    call.resolve(["prepared": false, "reason": "prepare-failed"])
                    return
                }
                self.narrationPlayer = player
                self.narrationCurrentSoundID = soundId
                self.narrationRequestId = requestId
                self.narrationCompleted = false
                call.resolve([
                    "prepared": true,
                    "reason": "prepared",
                    "soundId": soundId,
                    "requestId": requestId,
                    "durationMs": Int(player.duration * 1000),
                    "backend": "avfoundation-narration"
                ])
            } catch {
                call.resolve(["prepared": false, "reason": "decode-error"])
            }
        }
    }

    @objc func playNarration(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["accepted": false, "reason": "unavailable"]); return
            }
            guard let requestId = call.getInt("requestId"),
                  requestId > 0, requestId == self.narrationRequestId,
                  let player = self.narrationPlayer else {
                call.resolve(["accepted": false, "reason": "stale-request"]); return
            }
            if let reason = self.unavailableReason() {
                self.stopNarrationPlayer(reason: reason)
                call.resolve(["accepted": false, "reason": reason]); return
            }
            // End is terminal for this request: only a fresh human DEV tap
            // may prepare another one. Do not silently restart completed audio.
            guard !self.narrationCompleted else {
                call.resolve(["accepted": false, "reason": "already-ended"]); return
            }
            let accepted = player.play()
            var state = self.narrationSnapshot()
            state["accepted"] = accepted
            state["reason"] = accepted ? "started" : "play-denied"
            call.resolve(state)
        }
    }

    @objc func pauseNarration(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self,
                  let requestId = call.getInt("requestId"),
                  requestId > 0, requestId == self.narrationRequestId,
                  let player = self.narrationPlayer else {
                call.resolve(["paused": false, "reason": "stale-request"]); return
            }
            player.pause()
            var state = self.narrationSnapshot()
            state["paused"] = true
            call.resolve(state)
        }
    }

    @objc func seekNarration(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self,
                  let requestId = call.getInt("requestId"),
                  requestId > 0, requestId == self.narrationRequestId,
                  let player = self.narrationPlayer else {
                call.resolve(["seeked": false, "reason": "stale-request"]); return
            }
            guard let positionMs = call.getInt("positionMs"),
                  positionMs >= 0, positionMs <= Int(player.duration * 1000) else {
                call.resolve(["seeked": false, "reason": "invalid-position"]); return
            }
            guard !self.narrationCompleted else {
                call.resolve(["seeked": false, "reason": "already-ended"]); return
            }
            // Seeking does not start playback or activate the iOS session.
            player.currentTime = Double(positionMs) / 1000
            var state = self.narrationSnapshot()
            state["seeked"] = true
            call.resolve(state)
        }
    }

    @objc func getNarrationState(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["prepared": false, "reason": "unavailable"]); return
            }
            call.resolve(self.narrationSnapshot())
        }
    }

    @objc func stopNarration(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["stopped": false, "reason": "unavailable"]); return
            }
            // Reject a stale request instead of cutting a newer narrator.
            guard let requestId = call.getInt("requestId"),
                  requestId > 0, requestId == self.narrationRequestId else {
                call.resolve(["stopped": false, "reason": "stale-request"]); return
            }
            self.stopNarrationPlayer()
            call.resolve(["stopped": true, "reason": "stopped"])
        }
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        onMain { [weak self] in
            guard let self = self,
                  self.narrationPlayer === player,
                  let requestId = self.narrationRequestId,
                  UIApplication.shared.applicationState == .active,
                  !self.interrupted else { return }
            self.narrationCompleted = flag
            self.notifyListeners("biblozooNarration", data: [
                "type": flag ? "ended" : "failed",
                "requestId": requestId,
                "soundId": self.narrationCurrentSoundID ?? self.narrationSoundID,
                "positionMs": max(0, Int(player.currentTime * 1000)),
                "durationMs": max(0, Int(player.duration * 1000))
            ])
        }
    }


}
