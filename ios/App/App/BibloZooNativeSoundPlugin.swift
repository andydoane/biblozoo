import Foundation
import UIKit
import Capacitor
import AVFAudio

// Experimental output ONLY. Never call setCategory, setMode, setActive or
// reactivate the existing Web Audio recovery path from this plugin.
// The one allowlisted MP3 must be copied into the app by Xcode's Resources phase.
@objc(BibloZooNativeSoundPlugin)
final class BibloZooNativeSoundPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BibloZooNativeSoundPlugin"
    public let jsName = "BibloZooNativeSound"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "preload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        // Read-only test diagnostics; no audio engine or session modification.
        CAPPluginMethod(name: "getDebugState", returnType: CAPPluginReturnPromise)
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
    private var players: [String: AVAudioPlayer] = [:]
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
        ) { [weak self] _ in self?.leftForeground() })
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
        ) { [weak self] _ in
            self?.routeEventCount += 1
            self?.forgetPlayback()
        })
        observers.append(center.addObserver(
            forName: AVAudioSession.mediaServicesWereResetNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in self?.forgetPlayback() })
    }

    deinit {
        for token in observers { NotificationCenter.default.removeObserver(token) }
    }

    private func forgetPlayback() {
        for sound in players.values { sound.stop() }
        players.removeAll()
    }

    private func leftForeground() {
        forgetPlayback()
        if interrupted { leftForegroundDuringInterruption = true }
    }

    private func returnedToForeground() {
        // A genuine .began may have no matching .ended after suspension.
        // Merely becoming active does not resume anything or clear the latch.
        // Only the NEXT explicit user-tapped preload may attempt a new player.
        if interrupted && leftForegroundDuringInterruption {
            returnedToForegroundDuringInterruption = true
        }
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
                return
            }
            interrupted = true
            leftForegroundDuringInterruption =
                UIApplication.shared.applicationState != .active
            returnedToForegroundDuringInterruption = false
            lastInterruptionSignal = "began"
        case .ended:
            endedEventCount += 1
            interrupted = false
            leftForegroundDuringInterruption = false
            returnedToForegroundDuringInterruption = false
            lastInterruptionSignal = "ended"
        @unknown default:
            lastInterruptionSignal = "unrecognized"
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
        if interrupted {
            guard returnedToForegroundDuringInterruption else {
                return "interruption-pending"
            }
            // This check runs ONLY for an explicit new preload/play call.
            // Clear the stale latch after a full inactive->active transition,
            // but do not setActive, auto-resume, or claim sound health. The
            // AVAudioPlayer prepare/play result still decides acceptance.
            interrupted = false
            leftForegroundDuringInterruption = false
            returnedToForegroundDuringInterruption = false
            lastInterruptionSignal = "foreground-tap-retry"
        }
        return nil
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
                "lastAgeMs": ageMs
            ])
        }
    }

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
            self.players.removeValue(forKey: soundId)?.stop()
            do {
                let candidate = try AVAudioPlayer(contentsOf: url)
                candidate.numberOfLoops = 0
                guard candidate.prepareToPlay() else {
                    call.resolve(["prepared": false, "reason": "prepare-failed"])
                    return
                }
                // Preparing a player is not evidence that hardware is audible.
                self.players[soundId] = candidate
                call.resolve([
                    "prepared": true,
                    "reason": "prepared",
                    "backend": "avfoundation",
                    "lastInterruptionSignal": self.lastInterruptionSignal,
                    "durationMs": Int(candidate.duration * 1000)
                ])
            } catch {
                call.resolve(["prepared": false, "reason": "decode-error"])
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
            guard let sound = self.players[soundId] else {
                call.resolve(["accepted": false, "reason": "not-preloaded"])
                return
            }
            if sound.isPlaying { sound.stop() }
            sound.currentTime = 0
            sound.volume = Float(volume)
            let started = sound.play()
            // AVAudioPlayer.play() returning true is an accepted request,
            // NEVER proof the user heard a sound.
            call.resolve([
                "accepted": started,
                "reason": started ? "started" : "play-denied",
                "backend": "avfoundation",
                "durationMs": Int(sound.duration * 1000)
            ])
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
            self.players.removeValue(forKey: soundId)?.stop()
            call.resolve(["stopped": true, "reason": "stopped"])
        }
    }
}
