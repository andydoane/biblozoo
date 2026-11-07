import Foundation
import UIKit
import Capacitor
import AVFAudio

// N3a native-only iOS session owner: predecoded PCM-buffer effects on
// AVAudioEngine/AVAudioPlayerNode for star/chomp; unchanged AVAudioPlayer
// control sample for pilot-unlock. No Web Audio or
// HTML fallback. Only an explicit Start/Resume/DEV tap may request a bounded
// setActive(true) retry AFTER a completed foreground return. This plugin never
// calls setCategory/setMode, deactivates, or automatically resumes sound.
// Three allowlisted MP3 resources are packaged in the app target.
@objc(BibloZooNativeSoundPlugin)
final class BibloZooNativeSoundPlugin: CAPPlugin, CAPBridgedPlugin {
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
        CAPPluginMethod(name: "markRecentChompLate", returnType: CAPPluginReturnPromise)
    ]

    // All MP3s are checked-in project assets explicitly copied into the
    // iOS app bundle. No URLs or caller-controlled filesystem paths.
    // C.1 prepares separate players: preloading feed-star cannot evict
    // feed-chomp or the already-verified pilot-unlock sample.
    private let soundResources: [String: String] = [
        "pilot-unlock": "ui_pet_unlock",
        "feed-star": "dq_feed_star",
        "feed-chomp": "dq_feed_chomp"
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
    // Only these two fixed IDs use predecoded buffers. Unchanged native
    // AVAudioPlayer pet-unlock is a useful DEV A/B reference for latency.
    private let pcmEffectIDs: Set<String> = ["feed-star", "feed-chomp"]
    private var effectsEngine: AVAudioEngine? // playbackQueue only
    private var effectBuffers: [String: AVAudioPCMBuffer] = [:] // worker only
    private var effectNodes: [String: AVAudioPlayerNode] = [:] // worker only
    private let maximumEffectFrames: AVAudioFramePosition = 1_500_000
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
        for node in effectNodes.values { node.stop() }
        effectsEngine?.stop()
        effectNodes.removeAll()
        effectBuffers.removeAll()
        effectsEngine = nil
    }

    // Already on playbackQueue. At first prepare, decode the fixed bundled
    // MP3 to an AVAudioPCMBuffer, attach its own node to the native mixer,
    // start the engine and pre-start the player into silence (no clip queued).
    // Actual clip scheduling on collision must do NO decoding/engine startup.
    private func preparePCMEffectOnWorker(soundId: String, url: URL)
        -> (prepared: Bool, durationMs: Int, reason: String) {
        if let buffer = effectBuffers[soundId], effectsEngine?.isRunning == true,
           let node = effectNodes[soundId], node.isPlaying {
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
            guard buffer.frameLength > 0 else {
                return (false, 0, "pcm-empty")
            }
            let engine = effectsEngine ?? AVAudioEngine()
            let node = AVAudioPlayerNode()
            engine.attach(node)
            engine.connect(node, to: engine.mainMixerNode,
                           format: buffer.format)
            // Start and warm on the user-initiated preflight, not when the
            // next star/food collision asks for an immediate sound effect.
            if !engine.isRunning { try engine.start() }
            node.prepare(withFrameCount: buffer.frameLength)
            node.play() // no scheduled samples; never an audible autoplay
            effectsEngine = engine
            effectNodes[soundId] = node
            effectBuffers[soundId] = buffer
            return (true, Int(Double(buffer.frameLength) /
                              buffer.format.sampleRate * 1000), "prepared")
        } catch {
            // Do not silently fall back to AVAudioPlayer/Web audio for effects.
            // Next user gesture may retry after game exits/reprepares.
            discardEffectsOnWorker()
            return (false, 0, "pcm-decode-or-engine-start-failed")
        }
    }

    private func forgetPlayback() {
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
            let purpose = call.getString("purpose") ?? ""
            guard purpose == "dev" || purpose == "feeding" else {
                call.resolve(["ready": false, "reason": "invalid-purpose"]); return
            }
            if let blocked = self.unavailableReason(), blocked != "interruption-pending",
               blocked != "media-reset-requires-gesture" {
                self.lastActivationResult = blocked
                self.appendTrace("activation-denied")
                call.resolve(["ready": false, "reason": blocked]); return
            }
            let needsRecovery = self.interrupted || self.needsGestureAfterReset
            if !needsRecovery {
                self.lastActivationResult = "not-needed"
                self.appendTrace("activation-not-needed")
                call.resolve(["ready": true, "attempted": false, "reason": "not-needed"])
                return
            }
            // A real pending .began remains protected until either iOS sends
            // .ended OR the app has fully left/returned and the child taps.
            guard !self.interrupted || self.returnedToForegroundDuringInterruption else {
                self.lastActivationResult = "interruption-pending"
                self.appendTrace("activation-deferred")
                call.resolve(["ready": false, "attempted": false,
                              "reason": "interruption-pending"])
                return
            }
            let now = Date()
            if let last = self.lastActivationAt,
               now.timeIntervalSince(last) < self.minimumActivationInterval {
                self.lastActivationResult = "activation-cooldown"
                self.appendTrace("activation-deferred")
                call.resolve(["ready": false, "attempted": false,
                              "reason": "activation-cooldown"])
                return
            }
            guard self.activationAttemptsThisForeground <
                    self.maximumActivationAttemptsPerForeground else {
                self.lastActivationResult = "foreground-attempt-limit"
                self.appendTrace("activation-deferred")
                call.resolve(["ready": false, "attempted": false,
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
                self.leftForegroundDuringInterruption = false
                self.returnedToForegroundDuringInterruption = false
                self.lastInterruptionSignal = "foreground-activation-accepted"
                self.lastActivationResult = "os-accepted"
                self.appendTrace("activation-os-accepted")
                call.resolve(["ready": true, "attempted": true,
                              "reason": "os-accepted", "backend": "avfoundation"])
            } catch let error as NSError {
                // Never clear pending state or claim sound output on failure.
                self.lastActivationResult = "activation-os-rejected"
                self.appendTrace("activation-os-rejected")
                call.resolve(["ready": false, "attempted": true,
                              "reason": "activation-os-rejected",
                              "errorDomain": error.domain, "errorCode": error.code])
            }
        }
    }

    private func requestedId(_ call: CAPPluginCall) -> String? {
        guard let soundId = call.getString("soundId"),
              soundResources[soundId] != nil else { return nil }
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
            guard let soundId = self.requestedId(call),
                  let resourceName = self.soundResources[soundId] else {
                call.resolve(["prepared": false, "reason": "invalid-sound-id"])
                return
            }
            if let reason = self.unavailableReason() {
                call.resolve(["prepared": false, "reason": reason])
                return
            }
            guard let url = Bundle.main.url(forResource: resourceName, withExtension: "mp3") else {
                call.resolve(["prepared": false, "reason": "bundled-asset-missing"])
                return
            }
            let epoch = self.playbackEpochSnapshot()
            self.playbackQueue.async { [weak self] in
                guard let self = self else {
                    DispatchQueue.main.async {
                        call.resolve(["prepared": false, "reason": "unavailable"])
                    }
                    return
                }
                guard self.isCurrentPlaybackEpoch(epoch) else {
                    DispatchQueue.main.async {
                        call.resolve(["prepared": false, "reason": "stale"])
                    }
                    return
                }
                let startedAt = ProcessInfo.processInfo.systemUptime
                var prepared = false
                var durationMs = 0
                var failed = "prepare-failed"
                let backend: String
                if self.pcmEffectIDs.contains(soundId) {
                    // No MP3 decoding is permitted in the later play() path.
                    let result = self.preparePCMEffectOnWorker(
                        soundId: soundId, url: url)
                    prepared = result.prepared
                    durationMs = result.durationMs
                    failed = result.reason
                    backend = "avengine-pcm"
                } else {
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
                }
                let prepareMs = max(0, Int(
                    (ProcessInfo.processInfo.systemUptime - startedAt) * 1000))
                DispatchQueue.main.async { [weak self] in
                    guard let self = self else {
                        call.resolve(["prepared": false, "reason": "unavailable"])
                        return
                    }
                    guard self.isCurrentPlaybackEpoch(epoch) else {
                        call.resolve(["prepared": false, "reason": "stale"])
                        return
                    }
                    if let reason = self.unavailableReason() {
                        call.resolve(["prepared": false, "reason": reason])
                        return
                    }
                    self.lastNativePrepareMs = prepareMs
                    guard prepared else {
                        call.resolve(["prepared": false, "reason": failed])
                        return
                    }
                    // Prepared engine/player is NOT human-audible proof.
                    call.resolve([
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
                if self.pcmEffectIDs.contains(soundId) {
                    // Hot path: ONLY set volume and schedule the already-
                    // decoded memory buffer. No AVAudioPlayer.play(), decoding,
                    // engine.start(), node.play() or audio-session changes.
                    guard let engine = self.effectsEngine, engine.isRunning,
                          let node = self.effectNodes[soundId], node.isPlaying,
                          let buffer = self.effectBuffers[soundId] else {
                        DispatchQueue.main.async {
                            call.resolve(["accepted": false,
                                          "reason": "pcm-not-preloaded"])
                        }
                        return
                    }
                    node.volume = Float(volume)
                    node.scheduleBuffer(buffer, at: nil,
                                        options: [.interrupts],
                                        completionHandler: nil)
                    started = true  // scheduled for native rendering, NOT heard
                    durationMs = Int(Double(buffer.frameLength) /
                                     buffer.format.sampleRate * 1000)
                    backend = "avengine-pcm"
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
                if self.pcmEffectIDs.contains(soundId) {
                    // A paused/exited round tears down its warm engine. The
                    // next Got It!/Resume must explicitly prepare it again.
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

}
