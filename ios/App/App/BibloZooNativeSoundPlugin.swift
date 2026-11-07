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
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private let allowlistedId = "pilot-unlock"
    private let resourceName = "ui_pet_unlock"
    private var player: AVAudioPlayer?
    private var preparedId: String?
    private var interrupted = false
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
        ) { [weak self] _ in self?.forgetPlayback() })
        observers.append(center.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in self?.forgetPlayback() })
        observers.append(center.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: .main
        ) { [weak self] note in
            self?.forgetPlayback()
            let kind = (note.userInfo?[AVAudioSessionInterruptionTypeKey] as? NSNumber)?.uintValue
            self?.interrupted = kind != AVAudioSession.InterruptionType.ended.rawValue
        })
        observers.append(center.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in self?.forgetPlayback() })
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
        player?.stop()
        player = nil
        preparedId = nil
    }

    private func onMain(_ work: @escaping () -> Void) {
        if Thread.isMainThread { work() }
        else { DispatchQueue.main.async(execute: work) }
    }

    private func unavailableReason() -> String? {
        if UIApplication.shared.applicationState != .active { return "not-foreground" }
        if interrupted { return "interruption-pending" }
        if AVAudioSession.sharedInstance().category != .soloAmbient {
            return "category-not-soloambient"
        }
        return nil
    }

    private func validId(_ call: CAPPluginCall) -> Bool {
        call.getString("soundId") == allowlistedId
    }

    @objc func preload(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else {
                call.resolve(["prepared": false, "reason": "unavailable"])
                return
            }
            guard self.validId(call) else {
                call.resolve(["prepared": false, "reason": "invalid-sound-id"])
                return
            }
            if let reason = self.unavailableReason() {
                call.resolve(["prepared": false, "reason": reason])
                return
            }
            guard let url = Bundle.main.url(forResource: self.resourceName, withExtension: "mp3") else {
                call.resolve(["prepared": false, "reason": "bundled-asset-missing"])
                return
            }
            self.forgetPlayback()
            do {
                let candidate = try AVAudioPlayer(contentsOf: url)
                candidate.numberOfLoops = 0
                guard candidate.prepareToPlay() else {
                    call.resolve(["prepared": false, "reason": "prepare-failed"])
                    return
                }
                // Preparing a player is not evidence that hardware is audible.
                self.player = candidate
                self.preparedId = self.allowlistedId
                call.resolve([
                    "prepared": true,
                    "reason": "prepared",
                    "backend": "avfoundation",
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
            guard self.validId(call) else {
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
            guard self.preparedId == self.allowlistedId, let sound = self.player else {
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
            guard self.validId(call) else {
                call.resolve(["stopped": false, "reason": "invalid-sound-id"])
                return
            }
            self.forgetPlayback()
            call.resolve(["stopped": true, "reason": "stopped"])
        }
    }
}
