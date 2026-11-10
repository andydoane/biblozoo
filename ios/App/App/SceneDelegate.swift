import UIKit
import Capacitor
import AVFAudio

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = BibloZooDiagnosticsBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// Patch 58: register an opt-in diagnostic-only local Capacitor bridge.
// The underlying WKWebView configuration and playback behavior are unchanged.
final class BibloZooDiagnosticsBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(BibloZooAudioSessionDiagnosticsPlugin())
        bridge?.registerPluginInstance(BibloZooAudioSessionRecoveryPlugin())
        // Branch-only explicit-tap AVAudioPlayer pilot. Never invoked automatically.
        bridge?.registerPluginInstance(BibloZooNativeSoundPlugin())
        // N7b DEV-only explicit microphone permission and 4-second RAM-only
        // input-level probe; never wired into Flashcards or auto-started.
        bridge?.registerPluginInstance(BibloZooMicSessionProbePlugin())
        // N7f output-only Read My Verse playback, exact .audiotest bundle.
        bridge?.registerPluginInstance(BibloZooNativeReadOutputPlugin())
    }
}


// Patch 59: isolated, bounded native *experiment* for an already-proven
// frozen Web Audio clock. Does not set category/mode, deactivate the session,
// play audio, or run automatically on app foreground. The JavaScript caller
// must perform a second clock probe before permitting gameplay to continue.
@objc(BibloZooAudioSessionRecoveryPlugin)
final class BibloZooAudioSessionRecoveryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BibloZooAudioSessionRecoveryPlugin"
    public let jsName = "BibloZooAudioSessionRecovery"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "reactivateAfterClockStall", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getRecoveryState", returnType: CAPPluginReturnPromise)
    ]

    // All state is accessed on the main queue. Throttle both Feeding and
    // main-app callers in one place, even if JS makes overlapping requests.
    private let minimumInterval: TimeInterval = 12
    private let maximumAttemptsPerForeground = 2
    private var lastAttemptAt: Date?
    private var attemptsThisForeground = 0
    private var backgroundObserver: NSObjectProtocol?
    // Patch 60: read-only interruption epochs. Do not infer that AVAudioSession
    // is active: Apple does not expose a public audio-session isActive value.
    private var signalObservers: [NSObjectProtocol] = []
    private var interruptionSequence = 0
    private var lastInterruptionType = "none"
    private var lastInterruptionAt: Date?
    private var routeSequence = 0
    private var lastRouteChangeAt: Date?

    public override func load() {
        super.load()
        let center = NotificationCenter.default
        signalObservers.append(center.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self = self else { return }
            let rawType = (notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? NSNumber)?.uintValue
            self.interruptionSequence += 1
            self.lastInterruptionAt = Date()
            switch rawType {
            case AVAudioSession.InterruptionType.began.rawValue: self.lastInterruptionType = "began"
            case AVAudioSession.InterruptionType.ended.rawValue: self.lastInterruptionType = "ended"
            default: self.lastInterruptionType = "unknown"
            }
        })
        signalObservers.append(center.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.routeSequence += 1
            self?.lastRouteChangeAt = Date()
        })
        signalObservers.append(center.addObserver(
            forName: AVAudioSession.mediaServicesWereResetNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.interruptionSequence += 1
            self?.lastInterruptionType = "media-reset"
            self?.lastInterruptionAt = Date()
        })
        backgroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.attemptsThisForeground = 0
            self?.lastAttemptAt = nil
        }
    }

    deinit {
        for observer in signalObservers { NotificationCenter.default.removeObserver(observer) }
        if let observer = backgroundObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    // Read-only native snapshots for the Patch 60 coordinator. Signals are
    // observational and can be delayed or absent; JS always has a deadline.
    @objc func getRecoveryState(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.resolve(["available": false]); return
            }
            let session = AVAudioSession.sharedInstance()
            let now = Date()
            var state: [String: Any] = [
                "available": true,
                "foreground": UIApplication.shared.applicationState == .active,
                "category": session.category.rawValue,
                "otherAudioPlaying": session.isOtherAudioPlaying,
                "outputPorts": session.currentRoute.outputs.map { $0.portType.rawValue },
                "interruptionSequence": self.interruptionSequence,
                "lastInterruptionType": self.lastInterruptionType,
                "routeSequence": self.routeSequence
            ]
            if let last = self.lastInterruptionAt {
                state["interruptionAgeMs"] = max(0, Int(now.timeIntervalSince(last) * 1000))
            }
            if let last = self.lastRouteChangeAt {
                state["routeAgeMs"] = max(0, Int(now.timeIntervalSince(last) * 1000))
            }
            call.resolve(state)
        }
    }

    @objc func reactivateAfterClockStall(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            // N2: the .audiotest app is native-output ONLY. This legacy
            // Web-clock recovery bridge must NEVER compete with the
            // BibloZooNativeSound.activateFromGesture session owner.
            // Retain the older path for historical source/VM compatibility;
            // it cannot change the session in this experimental iOS bundle.
            if Bundle.main.bundleIdentifier == "com.andydoane.biblozoo.audiotest" {
                call.resolve(["attempted": false, "activated": false,
                              "reason": "legacy-web-recovery-disabled"])
                return
            }
            guard let self = self else {
                call.resolve(["attempted": false, "activated": false, "reason": "unavailable"])
                return
            }
            // An explicit trusted JS path passes a positive clock-stall probe
            // and a known source. Native code cannot observe Web Audio's clock.
            let source = call.getString("source") ?? ""
            guard call.getBool("clockStalled") == true,
                  source == "feeding" || source == "app" else {
                call.resolve(["attempted": false, "activated": false, "reason": "invalid-request"])
                return
            }
            guard UIApplication.shared.applicationState == .active else {
                call.resolve(["attempted": false, "activated": false, "reason": "not-foreground"])
                return
            }
            // This first experiment is intentionally scoped to the
            // SoloAmbient category observed in Log 6. Never interfere with
            // PlayAndRecord or another session mode used by verse recording.
            let audioSession = AVAudioSession.sharedInstance()
            guard audioSession.category == .soloAmbient else {
                call.resolve([
                    "attempted": false, "activated": false,
                    "reason": "category-not-soloambient",
                    "category": audioSession.category.rawValue
                ])
                return
            }
            let now = Date()
            // An unresolved interruption-began event means that iOS has not
            // told us the session is ready. Never spend a native activation
            // attempt (or reset its cooldown) while that signal is pending.
            // Web Audio's moving clock remains the final proof of recovery.
            if self.lastInterruptionType == "began" {
                call.resolve([
                    "attempted": false, "activated": false,
                    "reason": "interruption-pending",
                    "interruptionSequence": self.interruptionSequence
                ])
                return
            }
            if let last = self.lastAttemptAt, now.timeIntervalSince(last) < self.minimumInterval {
                call.resolve(["attempted": false, "activated": false, "reason": "cooldown"])
                return
            }
            guard self.attemptsThisForeground < self.maximumAttemptsPerForeground else {
                call.resolve(["attempted": false, "activated": false, "reason": "foreground-limit"])
                return
            }
            self.lastAttemptAt = now
            self.attemptsThisForeground += 1
            let otherBefore = audioSession.isOtherAudioPlaying
            do {
                // Experiment ONLY: request activation in the *current*
                // system-chosen category. May interrupt nonmixing external
                // playback; does not itself mean Web Audio is processing.
                try audioSession.setActive(true)
                call.resolve([
                    "attempted": true, "activated": true, "reason": "activated",
                    "attempt": self.attemptsThisForeground,
                    "category": audioSession.category.rawValue,
                    "otherAudioPlayingBefore": otherBefore,
                    "otherAudioPlayingAfter": audioSession.isOtherAudioPlaying
                ])
            } catch let error as NSError {
                call.resolve([
                    "attempted": true, "activated": false, "reason": "activation-error",
                    "attempt": self.attemptsThisForeground,
                    "errorDomain": error.domain, "errorCode": error.code,
                    "category": audioSession.category.rawValue,
                    "otherAudioPlayingBefore": otherBefore,
                    "otherAudioPlayingAfter": audioSession.isOtherAudioPlaying
                ])
            }
        }
    }
}


// N7b only: separate experimental microphone INPUT/route proof. The existing
// NativeSound plugin remains sole PLAYBACK owner; its DEV handoff drains the
// serial output worker before this plugin temporarily changes AVAudioSession.
// Nothing here saves voice samples, sends audio to speakers, logs content,
// restarts the microphone on foreground, or replaces Flashcards recording.
// Remove DEV probe before any stable integration; session policy for N7c
// remains subject to owner approval and real-device testing.
@objc(BibloZooMicSessionProbePlugin)
final class BibloZooMicSessionProbePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BibloZooMicSessionProbePlugin"
    public let jsName = "BibloZooMicSessionProbe"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beginProbe", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endProbe", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProbeState", returnType: CAPPluginReturnPromise),
        // N7c Flashcards capture. Opaque RAM take, never a file or JS bytes.
        CAPPluginMethod(name: "prepareCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beginCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finishCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "discardCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCaptureState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playCapture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopCapturePlayback", returnType: CAPPluginReturnPromise)
    ]

    private let maximumSeconds: TimeInterval = 4.0
    private var microphoneEngine: AVAudioEngine?
    private var savedCategory: AVAudioSession.Category?
    private var savedMode: AVAudioSession.Mode?
    private var savedOptions: AVAudioSession.CategoryOptions?
    private var requestInFlight = false
    private var generation = 0
    private var isProbing = false
    private var startedAt: Date?
    private var lastPeakPercent = 0
    private var buffersObserved = 0
    private var lastReason = "not-started"
    private var restorationSucceeded = true
    private var observers: [NSObjectProtocol] = []

    // N7c: one bounded, temporary voice take; NEVER files, JS payloads,
    // profile data, network or microphone monitoring. Samples and their
    // opaque ID are owned ONLY by captureWorker, not the main/callback thread.
    private let captureWorker = DispatchQueue(
        label: "com.biblozoo.n7c.capture", qos: .userInitiated)
    private var captureSamples: [Float] = [] // captureWorker only
    private var savedSamples: [Float] = [] // captureWorker only
    private var workerCaptureKey = -1 // captureWorker only
    private var savedCaptureKey = -1 // captureWorker only
    private var savedTakeId = "" // captureWorker only, opaque RAM take token
    private var savedSampleRate = 0.0 // captureWorker only
    private var workerLastLevelAt: TimeInterval = 0 // captureWorker only
    private var captureLevel: Double? // main thread, 0...1 only
    private var playbackEngine: AVAudioEngine? // main thread
    private var playbackNode: AVAudioPlayerNode? // main thread
    private var playbackGeneration = 0 // main thread
    private var playbackTakeId = ""
    private var playbackStartedAt: Date?
    // N7e: effect nodes and bounded pitch automation for the CURRENT
    // playback generation only. None of these store or export voice samples.
    private var playbackEffects: [AVAudioNode] = []
    // N7e.1: additional output-only voices for DEV chorus comparison.
    private var playbackChorusPlayers: [AVAudioPlayerNode] = []
    private var playbackPitchWorkItems: [DispatchWorkItem] = []
    private var playbackWackyTapInstalled = false
    private var playbackWackyStartNotified = false
    private var captureEngine: AVAudioEngine?
    // Separate session snapshot from the N7b DEV probe. Sharing the DEV
    // savedCategory slot would let its interruption observer restore a
    // Flashcards-owned microphone session prematurely.
    private var captureSavedCategory: AVAudioSession.Category?
    private var captureSavedMode: AVAudioSession.Mode?
    private var captureSavedOptions: AVAudioSession.CategoryOptions?
    private var capturePrepared = false
    private var captureRunning = false
    private var captureGeneration = 0 // main thread
    private var captureLimitMs = 120000
    private var captureSampleRate = 0.0
    private var captureStartedAt: Date?
    private var capturePreparedAt: Date?
    private var captureRestoreOK = true
    // N7d.2: Foreground-only audio priority starts ONLY on a true
    // Flashcards Record/Play tap. Normal completion keeps Apple Music paused.
    // External interruption or leaving the app relinquishes this claim.
    private var ownsFlashcardsForegroundAudio = false

    private func releaseFlashcardsAudioPriority() {
        guard ownsFlashcardsForegroundAudio else { return }
        ownsFlashcardsForegroundAudio = false
        // Never ask iOS to auto-resume the interrupted app's music.
        do { try AVAudioSession.sharedInstance().setActive(false) }
        catch { /* A real OS interruption may already have deactivated us. */ }
    }

    private func onMain(_ work: @escaping () -> Void) {
        if Thread.isMainThread { work() }
        else { DispatchQueue.main.async(execute: work) }
    }

    private var isDevBundle: Bool {
        return Bundle.main.bundleIdentifier ==
            "com.andydoane.biblozoo.audiotest"
    }

    private func permissionLabel() -> String {
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted: return "granted"
        case .denied: return "denied"
        case .undetermined: return "undetermined"
        @unknown default: return "unknown"
        }
    }

    private func state() -> [String: Any] {
        let session = AVAudioSession.sharedInstance()
        return [
            "available": isDevBundle,
            "permission": permissionLabel(),
            "foreground": UIApplication.shared.applicationState == .active,
            "running": isProbing,
            "category": session.category.rawValue,
            "mode": session.mode.rawValue,
            "otherAudioPlaying": session.isOtherAudioPlaying,
            "inputPorts": session.currentRoute.inputs.map { $0.portType.rawValue },
            "outputPorts": session.currentRoute.outputs.map { $0.portType.rawValue },
            "peakPercent": lastPeakPercent,
            "buffersObserved": buffersObserved,
            "reason": lastReason,
            "restored": restorationSucceeded
        ]
    }

    public override func load() {
        super.load()
        // Only .began is an actual *new* OS interruption. The old
        // observer cancelled live recording on .ended as well, including a
        // just-ended Apple Music handoff. Never auto-resume on .ended.
        let center = NotificationCenter.default
        observers.append(center.addObserver(
            forName: AVAudioSession.interruptionNotification, object: nil,
            queue: .main) { [weak self] notification in
                guard let self = self,
                      let raw = (notification.userInfo?[
                        AVAudioSessionInterruptionTypeKey] as? NSNumber)?.uintValue,
                      raw == AVAudioSession.InterruptionType.began.rawValue else {
                    return
                }
                self.stopProbe(reason: "interrupted")
                self.stopCaptureInternal(retain: false,
                                         reason: "interrupted", call: nil)
                self.stopPlaybackInternal(reason: "interrupted", notify: true)
                self.releaseFlashcardsAudioPriority()
            })
        // UIKit inactive/background or real media-services loss/reset always
        // cancels live work, even if a WebView callback never runs.
        for name in [UIApplication.willResignActiveNotification,
                     UIApplication.didEnterBackgroundNotification,
                     AVAudioSession.mediaServicesWereLostNotification,
                     AVAudioSession.mediaServicesWereResetNotification] {
            observers.append(center.addObserver(forName: name, object: nil,
                queue: .main) { [weak self] _ in
                    self?.stopProbe(reason: "interrupted")
                    self?.stopCaptureInternal(retain: false,
                                              reason: "interrupted", call: nil)
                    self?.stopPlaybackInternal(reason: "interrupted",
                                                notify: true)
                    self?.releaseFlashcardsAudioPriority()
                })
        }
        observers.append(center.addObserver(
            forName: AVAudioSession.routeChangeNotification, object: nil,
            queue: .main) { [weak self] notification in
                guard let self = self,
                      let raw = (notification.userInfo?[
                        AVAudioSessionRouteChangeReasonKey] as? NSNumber)?.uintValue,
                      let routeReason = AVAudioSession.RouteChangeReason(
                        rawValue: raw) else { return }
                // An app-owned .soloAmbient ↔ .playAndRecord category change,
                // output override or Bluetooth A2DP/HFP reconfiguration is
                // not the same as unplugging AirPods. Those notifications can
                // arrive late, even after the old 0.5s safety window.
                switch routeReason {
                case .oldDeviceUnavailable, .newDeviceAvailable,
                     .noSuitableRouteForCategory:
                    break
                default:
                    return
                }
                if self.isProbing {
                    if let started = self.startedAt,
                       Date().timeIntervalSince(started) >= 0.5 {
                        self.stopProbe(reason: "route-changed")
                    }
                }
                // Genuine external route loss/connection during playback
                // still cancels this take rather than continuing on speaker.
                if self.playbackEngine != nil {
                    if let started = self.playbackStartedAt,
                       Date().timeIntervalSince(started) >= 0.5 {
                        self.stopPlaybackInternal(reason: "route-changed",
                                                  notify: true)
                    }
                }
                // During the 3→2→1 countdown, AirPods may still be
                // negotiating their microphone route. Don't interpret that
                // as a recording interruption; beginCapture checks format.
                // Once *recording*, an actual route change cancels safely.
                if self.captureRunning ||
                   (self.capturePrepared &&
                    routeReason == .noSuitableRouteForCategory) {
                    self.stopCaptureInternal(retain: false,
                        reason: "route-changed", call: nil)
                }
            })
    }

    deinit {
        for token in observers { NotificationCenter.default.removeObserver(token) }
        if microphoneEngine != nil || savedCategory != nil {
            stopProbe(reason: "disposed")
        }
        if capturePrepared || captureRunning {
            stopCaptureInternal(retain: false, reason: "disposed", call: nil)
        }
        stopPlaybackInternal(reason: "disposed", notify: false)
    }

    // The ONLY microphone-permission prompt. Called on explicit DEV button
    // tap; reading state or opening the app NEVER requests a permission.
    @objc func requestPermission(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle,
                  UIApplication.shared.applicationState == .active else {
                call.resolve(["granted":false,"reason":"not-foreground-dev"])
                return
            }
            guard !self.requestInFlight && !self.isProbing &&
                  !self.capturePrepared && !self.captureRunning else {
                call.resolve(["granted":false,"reason":"busy"])
                return
            }
            self.requestInFlight = true
            AVAudioSession.sharedInstance().requestRecordPermission {
                [weak self] granted in
                DispatchQueue.main.async {
                    guard let self = self else {
                        call.resolve(["granted":false,"reason":"unavailable"])
                        return
                    }
                    self.requestInFlight = false
                    self.lastReason = granted ? "permission-granted" :
                                                "permission-denied"
                    call.resolve(["granted":granted,
                                  "reason":self.lastReason,
                                  "permission":self.permissionLabel()])
                }
            }
        }
    }

    // Native session/probe starts ONLY on the second explicit DEV tap,
    // after permission already granted AND the output worker's stop barrier
    // has acknowledged. Never run at app launch or from visibility return.
    // Dev candidate: playAndRecord + measurement + speaker default. A future
    // production session/route configuration is NOT approved by this pilot.
    @objc func beginProbe(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle,
                  UIApplication.shared.applicationState == .active else {
                call.resolve(["started":false,"reason":"not-foreground-dev"])
                return
            }
            let session = AVAudioSession.sharedInstance()
            guard self.permissionLabel() == "granted" else {
                call.resolve(["started":false,"reason":"permission-required"])
                return
            }
            guard !self.isProbing && self.savedCategory == nil &&
                  !self.capturePrepared && !self.captureRunning &&
                  !self.requestInFlight else {
                call.resolve(["started":false,"reason":"busy"])
                return
            }
            guard session.category == .soloAmbient else {
                call.resolve(["started":false,"reason":"category-not-soloambient"])
                return
            }
            // In particular, DON'T take priority from YouTube PiP still
            // playing. The owner can test paused PiP / an idle foreground.
            guard !session.isOtherAudioPlaying else {
                call.resolve(["started":false,"reason":"other-audio-playing"])
                return
            }
            self.savedCategory = session.category
            self.savedMode = session.mode
            self.savedOptions = session.categoryOptions
            self.restorationSucceeded = false
            self.generation += 1
            let token = self.generation
            self.lastPeakPercent = 0
            self.buffersObserved = 0
            self.startedAt = Date()
            do {
                try session.setCategory(.playAndRecord, mode: .measurement,
                                        options: [.defaultToSpeaker])
                try session.setActive(true)

                let engine = AVAudioEngine()
                let input = engine.inputNode
                let format = input.outputFormat(forBus: 0)
                guard format.sampleRate >= 8000,
                      format.channelCount > 0,
                      format.commonFormat == .pcmFormatFloat32 else {
                    self.stopProbe(reason: "unsupported-input-format")
                    call.resolve(["started":false,
                                  "reason":"unsupported-input-format"])
                    return
                }
                // Input tap ONLY. No audio is connected to output; no
                // recording file, Blob, persistent buffer, upload or replay.
                input.installTap(onBus: 0, bufferSize: 1024,
                                 format: format) { [weak self] buffer, _ in
                    guard let channels = buffer.floatChannelData else { return }
                    let length = Int(buffer.frameLength)
                    if length == 0 { return }
                    let channelCount = min(2, Int(buffer.format.channelCount))
                    var total: Double = 0
                    var count = 0
                    for channel in 0..<channelCount {
                        var frame = 0
                        while frame < length {
                            let sample = Double(channels[channel][frame])
                            total += sample * sample
                            count += 1
                            frame += 16
                        }
                    }
                    let rms = sqrt(total / Double(max(1,count)))
                    // An unexpected nonfinite input sample must NEVER
                    // become Int(NaN) and crash the physical DEV test app.
                    let safeRms = rms.isFinite ? max(rms, 0.00001) : 0.00001
                    let db = 20 * log10(safeRms)
                    let percent = max(0, min(100, Int((db + 55) * 100 / 55)))
                    DispatchQueue.main.async { [weak self] in
                        guard let self = self, self.generation == token,
                              self.isProbing else { return }
                        self.buffersObserved += 1
                        self.lastPeakPercent = max(self.lastPeakPercent, percent)
                    }
                }
                self.microphoneEngine = engine
                try engine.start()
                self.isProbing = true
                self.lastReason = "sampling-level-only"
                self.startedAt = Date()
                DispatchQueue.main.asyncAfter(deadline: .now() +
                    self.maximumSeconds) { [weak self] in
                        guard let self = self, self.generation == token,
                              self.isProbing else { return }
                        self.stopProbe(reason: "time-limit")
                    }
                call.resolve(["started":true,"reason":"sampling-level-only",
                              "maximumSeconds":Int(self.maximumSeconds),
                              "category":session.category.rawValue])
            } catch {
                self.stopProbe(reason: "setup-failed")
                call.resolve(["started":false,"reason":"setup-failed"])
            }
        }
    }

    // Stop and restore earlier category/mode/options without re-activating
    // the output session. Games regain it ONLY through a later real tap.
    // The shared output-plugin DEV handoff already invalidated its bank.
    private func stopProbe(reason: String) {
        guard microphoneEngine != nil || savedCategory != nil else { return }
        generation += 1
        isProbing = false
        if let engine = microphoneEngine {
            engine.inputNode.removeTap(onBus: 0)
            engine.stop()
        }
        microphoneEngine = nil
        let category = savedCategory
        let mode = savedMode
        let options = savedOptions
        savedCategory = nil
        savedMode = nil
        savedOptions = nil
        startedAt = nil
        let session = AVAudioSession.sharedInstance()
        var deactivated = true
        do {
            try session.setActive(false, options: [.notifyOthersOnDeactivation])
        } catch {
            deactivated = false
        }
        var categoryRestored = false
        if let category = category, let mode = mode, let options = options {
            do {
                try session.setCategory(category, mode: mode, options: options)
                categoryRestored = session.category == category &&
                                   session.mode == mode
            } catch {
                categoryRestored = false
            }
        }
        restorationSucceeded = deactivated && categoryRestored
        lastReason = restorationSucceeded ? reason : "restore-failed"
    }

    @objc func endProbe(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle else {
                call.resolve(["stopped":false,"reason":"unavailable"])
                return
            }
            let wasRunning = self.microphoneEngine != nil ||
                             self.savedCategory != nil
            self.stopProbe(reason: "stopped-by-user")
            call.resolve(["stopped":wasRunning,
                          "reason":self.lastReason,
                          "restored":self.restorationSucceeded])
        }
    }


    // N7c captures *only* on the child's Flashcards Record gesture.
    // Permission was requested by that gesture through requestPermission,
    // and the output owner's devPrepareForMicrophone barrier already
    // acknowledged stopping AVAudioEngine nodes. No input engine yet.
    @objc func prepareCapture(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle,
                  UIApplication.shared.applicationState == .active else {
                call.resolve(["prepared": false, "reason": "not-foreground-dev"])
                return
            }
            let session = AVAudioSession.sharedInstance()
            guard self.permissionLabel() == "granted" else {
                call.resolve(["prepared": false, "reason": "permission-required"])
                return
            }
            guard !self.isProbing && !self.capturePrepared &&
                  !self.captureRunning && self.playbackEngine == nil &&
                  self.captureSavedCategory == nil &&
                  !self.requestInFlight else {
                call.resolve(["prepared": false, "reason": "busy"])
                return
            }
            // N7d.1: An explicit Record tap may interrupt Apple Music/PiP.
            // isOtherAudioPlaying is not an OS rejection; setActive decides.
            guard session.category == .soloAmbient else {
                call.resolve(["prepared": false, "reason": "unsafe-session-state"])
                return
            }
            self.captureSavedCategory = session.category
            self.captureSavedMode = session.mode
            self.captureSavedOptions = session.categoryOptions
            self.captureRestoreOK = false
            self.captureLevel = nil
            self.captureGeneration += 1
            let captureKey = self.captureGeneration
            self.captureWorker.async {
                self.workerCaptureKey = captureKey
                self.captureSamples.removeAll(keepingCapacity: false)
                self.savedSamples.removeAll(keepingCapacity: false)
                self.savedCaptureKey = -1
                self.savedTakeId = ""
                self.savedSampleRate = 0
                self.workerLastLevelAt = 0
            }
            // If activation fails (e.g. phone call), the capture teardown
            // MUST run even though a mic engine was never started.
            self.capturePrepared = true
            self.capturePreparedAt = Date()
            do {
                // N7b owner-tested candidate, used only for explicitly
                // initiated Flashcards capture in the isolated Audio Test.
                // A final production audio-session policy remains N7g-gated.
                try session.setCategory(.playAndRecord, mode: .measurement,
                                        options: [.defaultToSpeaker])
                try session.setActive(true)
                self.ownsFlashcardsForegroundAudio = true
                self.captureRunning = false
                self.lastReason = "capture-prepared"
                call.resolve(["prepared": true, "reason": "capture-prepared"])
            } catch let error as NSError {
                self.stopCaptureInternal(retain: false,
                    reason: "prepare-failed", call: nil)
                call.resolve(["prepared": false, "reason": "prepare-failed",
                              "errorDomain": error.domain,
                              "errorCode": error.code])
            }
        }
    }

    // Called after Flashcards' ORIGINAL painted 3,2,1 countdown has fully
    // completed. No microphone stream samples are collected before this call.
    @objc func beginCapture(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle, self.capturePrepared,
                  !self.captureRunning,
                  UIApplication.shared.applicationState == .active else {
                call.resolve(["started": false, "reason": "not-prepared"])
                return
            }
            let requestMs = call.getInt("limitMs") ?? 120000
            self.captureLimitMs = max(1000, min(120000, requestMs))
            let token = self.captureGeneration
            do {
                let engine = AVAudioEngine()
                let input = engine.inputNode
                let format = input.outputFormat(forBus: 0)
                guard format.sampleRate >= 8000,
                      format.sampleRate <= 96000,
                      format.channelCount > 0,
                      format.commonFormat == .pcmFormatFloat32 else {
                    self.stopCaptureInternal(retain: false,
                        reason: "unsupported-format", call: nil)
                    call.resolve(["started": false,
                                  "reason": "unsupported-format"])
                    return
                }
                let sampleRate = format.sampleRate
                let maxFrames = Int((Double(self.captureLimitMs) / 1000.0) *
                                     sampleRate) + 1024
                // Hard RAM cap: <= ~46 MiB of mono Float32 for 120s at 96k.
                let frameCap = min(12_000_000, maxFrames)
                input.installTap(onBus: 0, bufferSize: 1024,
                                 format: format) { [weak self] buffer, _ in
                    guard let self = self,
                          let data = buffer.floatChannelData else { return }
                    let frames = Int(buffer.frameLength)
                    if frames <= 0 { return }
                    let channels = min(2, Int(buffer.format.channelCount))
                    var mono: [Float] = []
                    mono.reserveCapacity(frames)
                    for frame in 0..<frames {
                        var total: Float = 0
                        for channel in 0..<channels {
                            let sample = data[channel][frame]
                            total += sample.isFinite ? sample : 0
                        }
                        mono.append(total / Float(max(1, channels)))
                    }
                    // Input callback NEVER writes disk, blocks on a lock,
                    // updates UIKit, or calls AVAudioSession/Capacitor.
                    self.captureWorker.async { [weak self] in
                        guard let self = self,
                              self.workerCaptureKey == token else { return }
                        let space = max(0, frameCap - self.captureSamples.count)
                        if space > 0 {
                            self.captureSamples.append(
                                contentsOf: mono.prefix(space))
                        }
                        // Meter only: one bounded 0...1 RMS level, at most
                        // about 12 updates/sec; PCM stays on captureWorker.
                        let uptime = ProcessInfo.processInfo.systemUptime
                        if uptime - self.workerLastLevelAt >= 0.08 {
                            self.workerLastLevelAt = uptime
                            var sum: Double = 0
                            var count = 0
                            for i in stride(from: 0, to: mono.count, by: 16) {
                                let value = Double(mono[i])
                                sum += value * value
                                count += 1
                            }
                            let rms = sqrt(sum / Double(max(count, 1)))
                            let db = 20.0 * log10(max(0.00001, rms))
                            let level = max(0.0, min(1.0, (db + 55) / 55))
                            DispatchQueue.main.async { [weak self] in
                                guard let self = self,
                                      self.captureGeneration == token,
                                      self.captureRunning else { return }
                                self.captureLevel = level
                                self.notifyListeners("biblozooCaptureLevel",
                                    data: ["captureKey": token,
                                           "level": level])
                            }
                        }
                    }
                }
                self.captureEngine = engine
                try engine.start()
                self.captureSampleRate = sampleRate
                self.captureStartedAt = Date()
                self.captureRunning = true
                self.captureLevel = nil
                self.lastReason = "capturing"
                // Protect even if Web JS timers/background callbacks stall.
                DispatchQueue.main.asyncAfter(
                    deadline: .now() + .milliseconds(self.captureLimitMs)
                ) { [weak self] in
                    guard let self = self,
                          self.captureGeneration == token,
                          self.captureRunning else { return }
                    self.stopCaptureInternal(retain: true,
                        reason: "time-limit", call: nil)
                }
                call.resolve(["started": true, "reason": "capturing",
                              "limitMs": self.captureLimitMs,
                              "captureKey": token])
            } catch {
                self.stopCaptureInternal(retain: false,
                    reason: "engine-start-failed", call: nil)
                call.resolve(["started": false, "reason": "engine-start-failed"])
            }
        }
    }

    // Flush queued input buffers before returning one opaque RAM take.
    // N7d replay uses the same saved samples; no audio data enters JavaScript.
    private func stopCaptureInternal(retain: Bool, reason: String,
                                     call: CAPPluginCall?) {
        guard capturePrepared || captureRunning else {
            if let call = call {
                call.resolve(["ready": false, "reason": "not-capturing"])
            }
            return
        }
        let wasRecording = captureRunning
        let token = captureGeneration
        let rate = captureSampleRate
        captureRunning = false
        capturePrepared = false
        captureLevel = nil
        captureStartedAt = nil
        capturePreparedAt = nil
        if let engine = captureEngine {
            if wasRecording { engine.inputNode.removeTap(onBus: 0) }
            engine.stop()
        }
        captureEngine = nil
        let session = AVAudioSession.sharedInstance()
        let category = captureSavedCategory
        let mode = captureSavedMode
        let options = captureSavedOptions
        captureSavedCategory = nil
        captureSavedMode = nil
        captureSavedOptions = nil
        // Normal Stop/timeout keeps the user-claimed nonmixing audio
        // session ACTIVE, but restores .soloAmbient after mic input ends.
        // Deactivation with .notifyOthersOnDeactivation used to restart the
        // interrupted MP3 and relinquish priority on every completed take.
        let keepPriority = UIApplication.shared.applicationState == .active &&
            (reason == "stopped-by-user" || reason == "time-limit" ||
             reason == "discarded")
        var categoryRestored = false
        if let category = category, let mode = mode, let options = options {
            do {
                try session.setCategory(category, mode: mode, options: options)
                categoryRestored = session.category == category &&
                                   session.mode == mode
            } catch { categoryRestored = false }
        }
        captureRestoreOK = categoryRestored
        if !keepPriority || !categoryRestored {
            // Genuine interruption, background, failed setup, or route
            // loss must NEVER reclaim the other app's session on its own.
            self.releaseFlashcardsAudioPriority()
        }
        lastReason = captureRestoreOK ? reason : "restore-failed"
        let restoreOK = captureRestoreOK
        let savedId = UUID().uuidString
        captureWorker.async { [weak self] in
            guard let self = self else { return }
            let count = self.workerCaptureKey == token
                ? self.captureSamples.count : 0
            let keep = retain && wasRecording && count >= 256 &&
                       rate >= 8000 && restoreOK
            if keep {
                self.savedSamples = self.captureSamples
                self.savedCaptureKey = token
                self.savedTakeId = savedId
                self.savedSampleRate = rate
            } else {
                self.savedSamples.removeAll(keepingCapacity: false)
                self.savedCaptureKey = -1
                self.savedTakeId = ""
                self.savedSampleRate = 0
            }
            self.captureSamples.removeAll(keepingCapacity: false)
            self.workerCaptureKey = -1
            let durationMs = count > 0 && rate > 0
                ? Int(Double(count) / rate * 1000) : 0
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                if self.captureGeneration != token {
                    call?.resolve(["ready": false, "reason": "stale"])
                    return
                }
                self.lastReason = restoreOK
                    ? (keep ? "captured" : reason) : "restore-failed"
                if let call = call {
                    call.resolve([
                        "ready": keep,
                        "reason": self.lastReason,
                        "takeId": keep ? savedId : "",
                        "durationMs": durationMs,
                        "frameCount": count,
                        "restored": restoreOK
                    ])
                } else if retain && reason == "time-limit" {
                    // Deliver the completed take only AFTER the captureWorker
                    // has flushed its in-flight tap buffers into RAM.
                    self.notifyListeners("biblozooCaptureLifecycle", data: [
                        "kind": "completed",
                        "ready": keep,
                        "takeId": keep ? savedId : "",
                        "durationMs": durationMs,
                        "frameCount": count,
                        "restored": restoreOK
                    ])
                } else if !retain &&
                    (reason == "interrupted" || reason == "route-changed") {
                    self.notifyListeners("biblozooCaptureLifecycle", data: [
                        "kind": "interrupted",
                        "reason": reason
                    ])
                }
            }
        }
    }

    @objc func finishCapture(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle else {
                call.resolve(["ready": false, "reason": "unavailable"])
                return
            }
            self.stopCaptureInternal(retain: true,
                reason: "stopped-by-user", call: call)
        }
    }

    // Always release sample memory on Exit/Re-record/Skip. No take ever
    // goes into user profiles, a temp file or cloud backup.
    @objc func discardCapture(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle else {
                call.resolve(["discarded": false, "reason": "unavailable"])
                return
            }
            self.stopCaptureInternal(retain: false,
                reason: "discarded", call: nil)
            // Cancel delayed playCapture worker preparation even if no
            // player node exists yet; then stop any currently audible take.
            self.playbackGeneration += 1
            self.stopPlaybackInternal(reason: "discarded", notify: false)
            self.captureGeneration += 1
            self.captureWorker.async { [weak self] in
                guard let self = self else { return }
                self.workerCaptureKey = -1
                self.captureSamples.removeAll(keepingCapacity: false)
                self.savedSamples.removeAll(keepingCapacity: false)
                self.savedCaptureKey = -1
                self.savedTakeId = ""
                self.savedSampleRate = 0
                DispatchQueue.main.async {
                    call.resolve(["discarded": true])
                }
            }
        }
    }

    @objc func getCaptureState(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle else {
                call.resolve(["available": false])
                return
            }
            self.captureWorker.async { [weak self] in
                guard let self = self else { return }
                let frames = self.savedSamples.count
                DispatchQueue.main.async {
                    call.resolve([
                        "available": true,
                        "prepared": self.capturePrepared,
                        "recording": self.captureRunning,
                        "hasTake": frames >= 256,
                        "frameCount": frames,
                        "level": self.captureLevel ?? 0,
                        "playing": self.playbackEngine != nil,
                        "restored": self.captureRestoreOK,
                        "reason": self.lastReason
                    ])
                }
            }
        }
    }


    // N7e: native-only effects use AVAudioUnitTimePitch so speed and pitch
    // remain independent like the original SoundTouch-based browser presets.
    // The dynamic presets get a bounded number of UI-queue pitch changes.
    private static let wackyPresetIds: Set<String> = [
        "squirrel", "giant", "sleepy", "rocket", "roller_coaster",
        "ascending", "descending", "demon", "chorus_alien", "cave"
    ]

    // N7e.1 experiment only: five clean-first Demon alternatives and
    // five real multi-voice Chorus choices. Original two IDs stay unchanged.
    // Variants require a separate native DEV flag, not child random Wacky.
    private struct N7e1Variant {
        let cents: Float
        let rate: Float
        let lowPassHz: Float
        let roomWet: Float
        let distortionWet: Float
        let echoSeconds: Double
        let echoWet: Float
        let tailSeconds: Double
        let layerDetunes: [Float]
        let layerDelays: [Double]
        let layerVolumes: [Float]
        let dryVolume: Float
    }

    private static let n7e1Variants: [String: N7e1Variant] = [
        "demon_clean": N7e1Variant(cents: -600, rate: 0.94,
            lowPassHz: 2150, roomWet: 18, distortionWet: 0,
            echoSeconds: 0, echoWet: 0, tailSeconds: 1,
            layerDetunes: [], layerDelays: [],
            layerVolumes: [], dryVolume: 1),
        "demon_shadow": N7e1Variant(cents: -800, rate: 0.92,
            lowPassHz: 1620, roomWet: 34, distortionWet: 0,
            echoSeconds: 0, echoWet: 0, tailSeconds: 2,
            layerDetunes: [], layerDelays: [],
            layerVolumes: [], dryVolume: 1),
        "demon_abyss": N7e1Variant(cents: -1000, rate: 0.9,
            lowPassHz: 1180, roomWet: 25, distortionWet: 0,
            echoSeconds: 0, echoWet: 0, tailSeconds: 1.7,
            layerDetunes: [], layerDelays: [],
            layerVolumes: [], dryVolume: 1),
        "demon_whisper": N7e1Variant(cents: -400, rate: 0.97,
            lowPassHz: 2600, roomWet: 27, distortionWet: 0,
            echoSeconds: 0.12, echoWet: 16, tailSeconds: 1.6,
            layerDetunes: [], layerDelays: [],
            layerVolumes: [], dryVolume: 1),
        "demon_thunder": N7e1Variant(cents: -700, rate: 0.91,
            lowPassHz: 1850, roomWet: 24, distortionWet: 3,
            echoSeconds: 0.17, echoWet: 19, tailSeconds: 1.8,
            layerDetunes: [], layerDelays: [],
            layerVolumes: [], dryVolume: 1),
        "chorus_air": N7e1Variant(cents: 200, rate: 0.98,
            lowPassHz: 0, roomWet: 0, distortionWet: 0,
            echoSeconds: 0, echoWet: 0, tailSeconds: 0.22,
            layerDetunes: [-10,10], layerDelays: [0.015,0.029],
            layerVolumes: [0.18,0.18], dryVolume: 0.64),
        "chorus_swarm": N7e1Variant(cents: 300, rate: 0.98,
            lowPassHz: 0, roomWet: 0, distortionWet: 0,
            echoSeconds: 0, echoWet: 0, tailSeconds: 0.22,
            layerDetunes: [-23,23], layerDelays: [0.012,0.035],
            layerVolumes: [0.22,0.22], dryVolume: 0.56),
        "chorus_cosmic": N7e1Variant(cents: 500, rate: 0.93,
            lowPassHz: 0, roomWet: 13, distortionWet: 0,
            echoSeconds: 0, echoWet: 0, tailSeconds: 1.1,
            layerDetunes: [-42,42], layerDelays: [0.023,0.047],
            layerVolumes: [0.21,0.21], dryVolume: 0.58),
        "chorus_choir": N7e1Variant(cents: 0, rate: 0.96,
            lowPassHz: 0, roomWet: 9, distortionWet: 0,
            echoSeconds: 0, echoWet: 0, tailSeconds: 0.75,
            layerDetunes: [-14,14], layerDelays: [0.026,0.052],
            layerVolumes: [0.25,0.25], dryVolume: 0.5),
        "chorus_wobble": N7e1Variant(cents: 300, rate: 0.98,
            lowPassHz: 0, roomWet: 9, distortionWet: 0,
            echoSeconds: 0, echoWet: 0, tailSeconds: 0.7,
            layerDetunes: [-27,27], layerDelays: [0.017,0.043],
            layerVolumes: [0.23,0.23], dryVolume: 0.54)
    ]

    private func n7e1WireChorusLayers(_ variant: N7e1Variant,
                                     engine: AVAudioEngine,
                                     format: AVAudioFormat) -> [AVAudioPlayerNode] {
        guard variant.layerDetunes.count == 2 &&
              variant.layerDelays.count == 2 &&
              variant.layerVolumes.count == 2 else { return [] }
        var players: [AVAudioPlayerNode] = []
        // The two additional independent time-pitch chains use the SAME
        // opaque RAM take; distinct detune+12–52ms offsets create genuine
        // chorus voices instead of the original static single delay.
        for index in 0..<2 {
            let voice = AVAudioPlayerNode()
            voice.volume = variant.layerVolumes[index]
            let tune = AVAudioUnitTimePitch()
            tune.pitch = variant.cents + variant.layerDetunes[index]
            tune.rate = variant.rate
            tune.overlap = 8
            let delay = AVAudioUnitDelay()
            delay.delayTime = variant.layerDelays[index]
            delay.feedback = 0
            delay.wetDryMix = 100
            engine.attach(voice)
            engine.attach(tune)
            engine.attach(delay)
            engine.connect(voice, to: tune, format: format)
            engine.connect(tune, to: delay, format: format)
            engine.connect(delay, to: engine.mainMixerNode, format: format)
            playbackEffects.append(tune)
            playbackEffects.append(delay)
            players.append(voice)
        }
        return players
    }

    // N7f owner decision: promote Haunted Whisper and Wobbling Chorus to
    // the existing child IDs while retaining the separately selectable DEV
    // alternatives. No changes to the child's ten-preset random catalog.
    private func n7fApprovedPreset(_ id: String) -> String {
        switch id {
        case "demon": return "demon_whisper" // owner D4
        case "chorus_alien": return "chorus_wobble" // owner C5
        default: return id
        }
    }

    private func n7eRate(_ preset: String) -> Float {
        if let variant = Self.n7e1Variants[n7fApprovedPreset(preset)] {
            return variant.rate
        }
        switch preset {
        case "squirrel": return 1.15
        case "giant": return 0.9
        case "sleepy": return 0.55
        case "rocket": return 1.65
        case "demon": return 0.92
        case "chorus_alien": return 0.98
        default: return 1
        }
    }

    private func n7eCents(_ preset: String, at time: Double,
                          duration: Double) -> Float {
        if let variant = Self.n7e1Variants[n7fApprovedPreset(preset)] {
            if n7fApprovedPreset(preset) == "chorus_wobble" {
                return variant.cents + Float(75 * sin(time * 2 * .pi * 1.8))
            }
            return variant.cents
        }
        switch preset {
        case "squirrel": return 900
        case "giant": return -700
        case "sleepy": return -300
        case "rocket": return 400
        case "demon": return -800
        case "chorus_alien": return 300
        case "ascending":
            return Float(-1000 + 2000 * min(1, max(0, time / max(0.01, duration))))
        case "descending":
            return Float(1000 - 2000 * min(1, max(0, time / max(0.01, duration))))
        case "roller_coaster":
            // Original browser repeats +12, -12, +10, -10 semitones
            // in smooth 0.75s intervals through LONG recordings too.
            // Cycle instead of flattening after the fourth pitch swing.
            let targets: [Float] = [1200, -1200, 1000, -1000]
            let step = 0.75
            let position = max(0, time / step)
            let index = Int(position)
            let fraction = Float(position - Double(index))
            let previous: Float = index == 0 ? 0 :
                targets[(index - 1) % targets.count]
            let next = targets[index % targets.count]
            let result = previous + (next - previous) * fraction
            // A complete take returns toward natural pitch at its tail.
            if duration - time < 0.10 {
                return result * Float(max(0, (duration - time) / 0.10))
            }
            return result
        default: return 0
        }
    }

    private func n7eSchedulePitch(_ preset: String, unit: AVAudioUnitTimePitch,
                                  token: Int, duration: Double) {
        guard preset == "roller_coaster" || preset == "ascending" ||
              preset == "descending" || preset == "chorus_wobble" ||
              preset == "chorus_alien" else {
            return
        }
        // 80ms nominal, never more than 160 queued callbacks for long takes.
        let count = min(160, max(1, Int(duration / 0.08)))
        for step in 1...count {
            let offset = duration * Double(step) / Double(count)
            let cents = n7eCents(preset, at: offset, duration: duration)
            let work = DispatchWorkItem { [weak self, weak unit] in
                guard let self = self,
                      self.playbackGeneration == token,
                      self.playbackEngine != nil else { return }
                unit?.pitch = cents
            }
            playbackPitchWorkItems.append(work)
            DispatchQueue.main.asyncAfter(deadline: .now() + offset, execute: work)
        }
    }

    private func n7eWireEffects(_ preset: String, engine: AVAudioEngine,
                                player: AVAudioPlayerNode,
                                format: AVAudioFormat) -> AVAudioUnitTimePitch? {
        guard !preset.isEmpty else {
            engine.connect(player, to: engine.mainMixerNode, format: format)
            return nil
        }
        let pitch = AVAudioUnitTimePitch()
        pitch.rate = n7eRate(preset)
        pitch.pitch = n7eCents(preset, at: 0, duration: 1)
        pitch.overlap = 8
        engine.attach(pitch)
        var effects: [AVAudioNode] = [pitch]
        if let variant = Self.n7e1Variants[n7fApprovedPreset(preset)] {
            // Clean-first Demon presets avoid the owner-reported corrupted
            // MP3 distortion. Chorus variant volume sums are near 1.0.
            if variant.lowPassHz > 0 {
                let eq = AVAudioUnitEQ(numberOfBands: 1)
                eq.bands[0].filterType = .lowPass
                eq.bands[0].frequency = variant.lowPassHz
                eq.bands[0].bypass = false
                engine.attach(eq)
                effects.append(eq)
            }
            if variant.distortionWet > 0 {
                let drive = AVAudioUnitDistortion()
                drive.loadFactoryPreset(.multiBrokenSpeaker)
                drive.wetDryMix = variant.distortionWet
                engine.attach(drive)
                effects.append(drive)
            }
            if variant.echoSeconds > 0 {
                let echo = AVAudioUnitDelay()
                echo.delayTime = variant.echoSeconds
                echo.feedback = 7
                echo.wetDryMix = variant.echoWet
                engine.attach(echo)
                effects.append(echo)
            }
            if variant.roomWet > 0 {
                let reverb = AVAudioUnitReverb()
                reverb.loadFactoryPreset(.largeRoom)
                reverb.wetDryMix = variant.roomWet
                engine.attach(reverb)
                effects.append(reverb)
            }
            player.volume = variant.dryVolume
        } else if preset == "demon" {
            let eq = AVAudioUnitEQ(numberOfBands: 1)
            let band = eq.bands[0]
            band.filterType = .lowPass
            band.frequency = 1500
            band.bypass = false
            engine.attach(eq)
            effects.append(eq)
            let drive = AVAudioUnitDistortion()
            drive.loadFactoryPreset(.multiBrokenSpeaker)
            drive.wetDryMix = 14
            engine.attach(drive)
            effects.append(drive)
            let reverb = AVAudioUnitReverb()
            reverb.loadFactoryPreset(.largeRoom)
            reverb.wetDryMix = 52
            engine.attach(reverb)
            effects.append(reverb)
        } else if preset == "chorus_alien" {
            let chorus = AVAudioUnitDelay()
            chorus.delayTime = 0.014
            chorus.feedback = 0
            chorus.wetDryMix = 34
            engine.attach(chorus)
            effects.append(chorus)
        } else if preset == "cave" {
            let reverb = AVAudioUnitReverb()
            reverb.loadFactoryPreset(.largeHall)
            reverb.wetDryMix = 58
            engine.attach(reverb)
            effects.append(reverb)
        }
        var previous: AVAudioNode = player
        for effect in effects {
            engine.connect(previous, to: effect, format: format)
            previous = effect
        }
        engine.connect(previous, to: engine.mainMixerNode, format: format)
        playbackEffects = effects
        return pitch
    }

    // N7d: only the explicit "Play My Recording" gesture may start
    // playback. ONE fresh AVAudioEngine+AVAudioPlayerNode is owned here
    // while the previously captured mono PCM stays opaque in RAM on the
    // capture worker. This never connects microphone input to output and
    // does not use WebAudio, HTMLMediaElement or an AVAudioRecorder file.
    @objc func playCapture(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle,
                  UIApplication.shared.applicationState == .active,
                  !self.capturePrepared, !self.captureRunning,
                  !self.isProbing, self.playbackEngine == nil else {
                call.resolve(["started": false, "reason": "not-ready"])
                return
            }
            let session = AVAudioSession.sharedInstance()
            // N7d.1: An explicit Play tap may reclaim nonmixing .soloAmbient
            // from Apple Music, subject to iOS activation priority.
            guard session.category == .soloAmbient else {
                call.resolve(["started": false,
                              "reason": "category-not-soloambient"])
                return
            }
            let requestedId = call.getString("takeId") ?? ""
            // Empty preset means the unchanged dry recorded-voice path.
            let effectId = call.getString("presetId") ?? ""
            let devVariant = call.getBool("devVariant") == true
            guard effectId.isEmpty || Self.wackyPresetIds.contains(effectId) ||
                  (devVariant && Self.n7e1Variants[effectId] != nil) else {
                call.resolve(["started": false, "reason": "unknown-preset"])
                return
            }
            guard !requestedId.isEmpty else {
                call.resolve(["started": false, "reason": "missing-take"])
                return
            }
            self.playbackGeneration += 1
            let playToken = self.playbackGeneration
            self.captureWorker.async { [weak self] in
                guard let self = self else { return }
                guard self.savedCaptureKey >= 0,
                      self.savedTakeId == requestedId,
                      self.savedSamples.count >= 256,
                      self.savedSamples.count <= 12_000_000,
                      self.savedSampleRate >= 8000,
                      self.savedSampleRate <= 96000,
                      let format = AVAudioFormat(
                        standardFormatWithSampleRate: self.savedSampleRate,
                        channels: 1) else {
                    DispatchQueue.main.async {
                        call.resolve(["started": false, "reason": "take-unavailable"])
                    }
                    return
                }
                // Reverb/delay tails need actual silent source frames after
                // speech; the normal dry take is byte-for-byte unchanged.
                let tail: Double = Self.n7e1Variants[
                    self.n7fApprovedPreset(effectId)]?.tailSeconds ??
                    (effectId == "cave" ? 3.2 :
                     effectId == "demon" ? 2.4 :
                     effectId == "chorus_alien" ? 0.2 : 0)
                let totalFrames = self.savedSamples.count +
                    Int(self.savedSampleRate * tail)
                guard totalFrames <= 12_500_000,
                      let buffer = AVAudioPCMBuffer(
                        pcmFormat: format,
                        frameCapacity: AVAudioFrameCount(totalFrames)),
                      let samplesOut = buffer.floatChannelData else {
                    DispatchQueue.main.async {
                        call.resolve(["started": false,
                                      "reason": "take-unavailable"])
                    }
                    return
                }
                // PCM copy and bounded silence tail run only on the serial
                // worker, never the WebView/main/render/audio callback.
                if tail > 0 {
                    // Only atmosphere effects need extra zeroed tail frames.
                    // Dry playback keeps N7d's original direct PCM copy.
                    memset(samplesOut[0], 0,
                           totalFrames * MemoryLayout<Float>.size)
                }
                self.savedSamples.withUnsafeBufferPointer { source in
                    guard let base = source.baseAddress else { return }
                    samplesOut[0].update(from: base, count: source.count)
                }
                buffer.frameLength = AVAudioFrameCount(totalFrames)
                let voiceSeconds = Double(self.savedSamples.count) /
                    self.savedSampleRate / Double(self.n7eRate(effectId))
                DispatchQueue.main.async { [weak self] in
                    guard let self = self,
                          self.playbackGeneration == playToken,
                          UIApplication.shared.applicationState == .active,
                          AVAudioSession.sharedInstance().category == .soloAmbient,
                          !self.captureRunning, !self.capturePrepared,
                          self.playbackEngine == nil else {
                        call.resolve(["started": false,
                                      "reason": "stale-or-inactive"])
                        return
                    }
                    let engine = AVAudioEngine()
                    let player = AVAudioPlayerNode()
                    engine.attach(player)
                    // N7e: all ten effects are generated by AVFoundation
                    // nodes, not WebAudio. Keep nodes alive until stop/ended.
                    let pitch = self.n7eWireEffects(effectId, engine: engine,
                        player: player, format: format)
                    // DEV-only chorus processing: two independent voices,
                    // same real RAM take and shared output-only session.
                    let chorusVoices: [AVAudioPlayerNode]
                    if let variant = Self.n7e1Variants[
                        self.n7fApprovedPreset(effectId)],
                       !variant.layerDetunes.isEmpty {
                        chorusVoices = self.n7e1WireChorusLayers(
                            variant, engine: engine, format: format)
                    } else {
                        chorusVoices = []
                    }
                    do {
                        // A deliberate Play tap, not a foreground callback.
                        // Leave the normal .soloAmbient category unchanged.
                        try AVAudioSession.sharedInstance().setActive(true)
                        self.ownsFlashcardsForegroundAudio = true
                        self.playbackEngine = engine
                        self.playbackNode = player
                        self.playbackChorusPlayers = chorusVoices
                        self.playbackTakeId = requestedId
                        self.playbackStartedAt = Date()
                        self.playbackWackyStartNotified = false
                        // N7e Wacky: bridge started:true confirms engine
                        // acceptance, NOT audible effect. One-time child
                        // Wacky eligibility needs a render-buffer signal
                        // from the REAL post-DSP native mixer. Only a
                        // boolean event crosses JS, never microphone PCM.
                        if !effectId.isEmpty {
                            engine.mainMixerNode.installTap(
                                onBus: 0, bufferSize: 1024,
                                format: nil) { [weak self] audio, _ in
                                guard audio.frameLength > 0,
                                      let channels = audio.floatChannelData else {
                                    return
                                }
                                let frames = min(512, Int(audio.frameLength))
                                var audible = false
                                for sample in stride(from: 0, to: frames, by: 16) {
                                    if abs(channels[0][sample]) > 0.0001 {
                                        audible = true
                                        break
                                    }
                                }
                                if !audible { return }
                                DispatchQueue.main.async { [weak self] in
                                    guard let self = self,
                                          self.playbackGeneration == playToken,
                                          self.playbackEngine != nil,
                                          !self.playbackWackyStartNotified else {
                                        return
                                    }
                                    self.playbackWackyStartNotified = true
                                    self.notifyListeners("biblozooCapturePlayback", data: [
                                        "kind": "started",
                                        "takeId": requestedId,
                                        "playToken": playToken
                                    ])
                                }
                            }
                            self.playbackWackyTapInstalled = true
                        }
                        if let pitch = pitch {
                            self.n7eSchedulePitch(effectId, unit: pitch,
                                token: playToken, duration: voiceSeconds)
                        }
                        // Each chorus layer consumes the exact same buffer,
                        // not an uploaded, serialized or fabricated sample.
                        for voice in chorusVoices {
                            voice.scheduleBuffer(buffer, at: nil,
                                options: [], completionHandler: nil)
                        }
                        player.scheduleBuffer(buffer,
                            completionCallbackType: .dataPlayedBack) {
                            [weak self] _ in
                            DispatchQueue.main.async {
                                guard let self = self,
                                      self.playbackGeneration == playToken,
                                      self.playbackEngine != nil else { return }
                                self.stopPlaybackInternal(reason: "ended",
                                                          notify: true)
                            }
                        }
                        try engine.start()
                        for voice in chorusVoices { voice.play() }
                        player.play()
                        call.resolve(["started": true,
                                      "reason": "native-playing",
                                      "playToken": playToken,
                                      "presetId": effectId])
                    } catch {
                        self.stopPlaybackInternal(reason: "start-failed",
                                                  notify: false)
                        call.resolve(["started": false,
                                      "reason": "start-failed"])
                    }
                }
            }
        }
    }

    // Called by actual Stop Playback, pagehide or other native lifecycle.
    // Never clears savedSamples: re-play is possible until Exit/Re-record.
    private func stopPlaybackInternal(reason: String, notify: Bool) {
        guard playbackEngine != nil || playbackNode != nil else { return }
        let token = playbackGeneration
        let take = playbackTakeId
        playbackGeneration += 1 // invalidate in-flight AVAudio callbacks
        if playbackWackyTapInstalled {
            playbackEngine?.mainMixerNode.removeTap(onBus: 0)
            playbackWackyTapInstalled = false
        }
        playbackWackyStartNotified = false
        for item in playbackPitchWorkItems { item.cancel() }
        playbackPitchWorkItems.removeAll()
        for voice in playbackChorusPlayers { voice.stop() }
        playbackChorusPlayers.removeAll()
        playbackNode?.stop()
        playbackEngine?.stop()
        playbackNode = nil
        playbackEngine = nil
        playbackEffects.removeAll()
        playbackTakeId = ""
        playbackStartedAt = nil
        // Ending a normal take or manually stopping it only stops the PCM
        // player. Keep the foreground nonmixing AVAudioSession active so
        // Apple Music/PiP stays paused until its OWN next Play gesture.
        // A true interruption, route loss or setup failure relinquishes it.
        if reason != "ended" && reason != "stopped-by-user" &&
           reason != "discarded" {
            self.releaseFlashcardsAudioPriority()
        }
        if notify {
            notifyListeners("biblozooCapturePlayback", data: [
                "kind": reason == "ended" ? "ended" : "interrupted",
                "reason": reason,
                "takeId": take,
                "playToken": token
            ])
        }
    }

    @objc func stopCapturePlayback(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle else {
                call.resolve(["stopped": false, "reason": "unavailable"])
                return
            }
            // Explicit Pause also invalidates an in-flight PCM copy: a
            // late worker callback must NEVER start playing on its own.
            self.playbackGeneration += 1
            self.stopPlaybackInternal(reason: "stopped-by-user",
                                      notify: false)
            call.resolve(["stopped": true])
        }
    }

    // Purely read-only status; never grants permission, requests capture,
    // sets the category, resumes the mic or activates audio.
    @objc func getProbeState(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle else {
                call.resolve(["available":false])
                return
            }
            call.resolve(self.state())
        }
    }
}


// N7f: Read My Verse OUTPUT only. All source MP3 clips must be from the
// published, installed app bundle; no caller URLs/paths, mic, user files,
// network access, WebAudio/HTML fallback, or silent fake completion.
// Independent AVAudioPlayers allow Verse Crawl soundtrack + real narration
// + ending overlap. OS .soloAmbient session is shared, never mixed/ducked.
@objc(BibloZooNativeReadOutputPlugin)
final class BibloZooNativeReadOutputPlugin: CAPPlugin, CAPBridgedPlugin,
    AVAudioPlayerDelegate {
    public let identifier = "BibloZooNativeReadOutputPlugin"
    public let jsName = "BibloZooNativeReadOutput"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "activateFromGesture", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playClip", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopClip", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seekClip", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playCue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopCues", returnType: CAPPluginReturnPromise)
    ]
    private var clips: [String: AVAudioPlayer] = [:]
    private var cues: [AVAudioPlayer] = []
    private var watches: [NSObjectProtocol] = []
    private var progressTimer: Timer?
    private var ownedByReadGesture = false
    private var generation = 0

    private var isDevBundle: Bool {
        Bundle.main.bundleIdentifier == "com.andydoane.biblozoo.audiotest"
    }
    private func onMain(_ action: @escaping () -> Void) {
        if Thread.isMainThread { action() }
        else { DispatchQueue.main.async(execute: action) }
    }
    public override func load() {
        super.load()
        let center = NotificationCenter.default
        watches.append(center.addObserver(forName:
            AVAudioSession.interruptionNotification, object: nil,
            queue: .main) { [weak self] note in
                guard let raw = (note.userInfo?[
                    AVAudioSessionInterruptionTypeKey] as? NSNumber)?.uintValue,
                    raw == AVAudioSession.InterruptionType.began.rawValue else {
                    return
                }
                self?.cancelAll(reason: "interrupted")
            })
        for name in [UIApplication.willResignActiveNotification,
                     UIApplication.didEnterBackgroundNotification,
                     AVAudioSession.mediaServicesWereLostNotification,
                     AVAudioSession.mediaServicesWereResetNotification] {
            watches.append(center.addObserver(forName: name, object: nil,
                queue: .main) { [weak self] _ in
                    self?.cancelAll(reason: "interrupted")
                })
        }
        // N7d.2 parity: only genuine route loss/arrival invalidates current
        // Read audio. Category/override/AirPods setup notices are not the
        // same as actual device disconnect and can arrive late.
        watches.append(center.addObserver(forName:
            AVAudioSession.routeChangeNotification, object: nil,
            queue: .main) { [weak self] note in
                guard let raw = (note.userInfo?[
                    AVAudioSessionRouteChangeReasonKey] as? NSNumber)?.uintValue,
                    let reason = AVAudioSession.RouteChangeReason(
                        rawValue: raw) else { return }
                switch reason {
                case .oldDeviceUnavailable, .newDeviceAvailable,
                     .noSuitableRouteForCategory:
                    self?.cancelAll(reason: "interrupted")
                default: break
                }
            })
    }
    deinit {
        watches.forEach { NotificationCenter.default.removeObserver($0) }
        progressTimer?.invalidate()
        clips.values.forEach { $0.stop() }
        cues.forEach { $0.stop() }
    }
    // Validated published JSON, never a user-provided filename.
    private func publishedVerse(_ id: String) -> Bool {
        guard id.count > 0 && id.count <= 65 &&
              id.range(of: "^[a-z0-9_-]+$",
                       options: .regularExpression) != nil,
              let url = Bundle.main.url(forResource: id,
                withExtension: "json", subdirectory: "public/verse_data"),
              let data = try? Data(contentsOf: url),
              let verse = (try? JSONSerialization.jsonObject(with: data))
                as? [String: Any] else { return false }
        return verse["published"] as? Bool == true &&
               verse["verseId"] as? String == id
    }
    // Do not accept paths, URLs, arbitrary clip keys or external IDs.
    private func bundledClip(_ key: String) -> URL? {
        let fixed: [String: (String, String)] = [
            "crawl-theme": ("verse_images/read_my_verse",
                            "verse_crawl_theme_ducked"),
            "crawl-ending": ("verse_images/read_my_verse",
                             "verse_crawl_theme_ending"),
            "typewriter-alert": ("verse_images/read_my_verse",
                                 "typewriter_alert"),
            "keyboard-alert": ("verse_images/read_my_verse",
                               "keyboard_alert"),
            "incorrect": ("verse_images/daily_questions", "dq_incorrect")
        ]
        if let entry = fixed[key] {
            return Bundle.main.url(forResource: entry.1, withExtension: "mp3",
                subdirectory: "public/" + entry.0)
        }
        if key.hasPrefix("typewriter-"), let index =
            Int(key.dropFirst("typewriter-".count)),
            (1...3).contains(index) {
            return Bundle.main.url(forResource: "typewriter_\(index)",
                withExtension: "mp3",
                subdirectory: "public/verse_images/read_my_verse")
        }
        if key.hasPrefix("keyboard-"), let index =
            Int(key.dropFirst("keyboard-".count)),
            (1...7).contains(index) {
            return Bundle.main.url(forResource: "keyboard_\(index)",
                withExtension: "mp3",
                subdirectory: "public/verse_images/read_my_verse")
        }
        guard key.hasPrefix("verse:") else { return nil }
        let stem = String(key.dropFirst("verse:".count))
        guard stem.count <= 80 &&
              stem.range(of: "^[a-z0-9_-]+$",
                         options: .regularExpression) != nil else { return nil }
        var valid = publishedVerse(stem)
        if stem.hasSuffix("_ref") {
            valid = publishedVerse(String(stem.dropLast(4)))
        } else if !valid, let letter = stem.last,
                  letter >= "a" && letter <= "z" {
            valid = publishedVerse(String(stem.dropLast()))
        }
        guard valid else { return nil }
        return Bundle.main.url(forResource: stem, withExtension: "mp3",
            subdirectory: "public/verse_audio")
    }
    private func emit(_ kind: String, id: String,
                      player: AVAudioPlayer, reason: String = "") {
        notifyListeners("biblozooReadOutput", data: [
            "kind": kind, "requestId": id,
            "positionMs": Int(player.currentTime * 1000),
            "durationMs": Int(player.duration * 1000),
            "reason": reason
        ])
    }
    private func armProgress() {
        guard progressTimer == nil else { return }
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.14,
            repeats: true) { [weak self] _ in
                guard let self = self else { return }
                for (id, player) in self.clips where player.isPlaying {
                    self.emit("progress", id: id, player: player)
                }
                if self.clips.isEmpty {
                    self.progressTimer?.invalidate()
                    self.progressTimer = nil
                }
            }
    }
    private func cancelAll(reason: String) {
        generation += 1
        ownedByReadGesture = false
        for (id, player) in clips {
            player.stop()
            if reason == "interrupted" {
                emit("interrupted", id: id, player: player, reason: reason)
            }
        }
        clips.removeAll()
        cues.forEach { $0.stop() }
        cues.removeAll()
        progressTimer?.invalidate()
        progressTimer = nil
        // Never reactivate on OS interruption/foreground return. Do not
        // send .notifyOthersOnDeactivation, which auto-resumes Apple Music.
    }
    @objc func activateFromGesture(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle,
                  UIApplication.shared.applicationState == .active,
                  AVAudioSession.sharedInstance().category == .soloAmbient else {
                call.resolve(["activated": false, "reason": "not-ready"])
                return
            }
            do {
                try AVAudioSession.sharedInstance().setActive(true)
                self.ownedByReadGesture = true
                call.resolve(["activated": true])
            } catch {
                self.ownedByReadGesture = false
                call.resolve(["activated": false, "reason": "os-denied"])
            }
        }
    }
    @objc func playClip(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle,
                  UIApplication.shared.applicationState == .active,
                  self.ownedByReadGesture,
                  let id = call.getString("requestId"), id.count > 0,
                  id.count <= 64, self.clips.count < 8 ||
                  self.clips[id] != nil else {
                call.resolve(["started": false, "reason": "not-ready"])
                return
            }
            guard let key = call.getString("clipId"),
                  let url = self.bundledClip(key) else {
                call.resolve(["started": false, "reason": "unpublished-clip"])
                return
            }
            self.clips[id]?.stop()
            self.clips[id] = nil
            do {
                let player = try AVAudioPlayer(contentsOf: url)
                player.delegate = self
                player.numberOfLoops = 0
                let volume = call.getDouble("volume") ?? 1
                player.volume = Float(min(1, max(0, volume)))
                player.prepareToPlay()
                let seekMs = call.getDouble("positionMs") ?? 0
                if seekMs > 0 {
                    player.currentTime = min(player.duration,
                                             max(0, seekMs / 1000))
                }
                guard player.play() else {
                    call.resolve(["started": false, "reason": "player-refused"])
                    return
                }
                self.clips[id] = player
                self.armProgress()
                self.emit("started", id: id, player: player)
                call.resolve(["started": true,
                              "positionMs": Int(player.currentTime * 1000),
                              "durationMs": Int(player.duration * 1000)])
            } catch {
                call.resolve(["started": false, "reason": "decode-failed"])
            }
        }
    }
    @objc func stopClip(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self else { call.resolve(["stopped":false]); return }
            if let id = call.getString("requestId"),
               let player = self.clips.removeValue(forKey: id) {
                player.stop()
            }
            call.resolve(["stopped": true])
        }
    }
    @objc func seekClip(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle,
                  let id = call.getString("requestId"),
                  let player = self.clips[id],
                  let ms = call.getDouble("positionMs"),
                  ms.isFinite else {
                call.resolve(["seeked": false]); return
            }
            player.currentTime = min(player.duration, max(0, ms / 1000))
            self.emit("progress", id: id, player: player)
            call.resolve(["seeked": true])
        }
    }
    @objc func stopAll(_ call: CAPPluginCall) {
        onMain { [weak self] in
            self?.cancelAll(reason: "stopped")
            call.resolve(["stopped": true])
        }
    }
    public func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer,
                                            successfully flag: Bool) {
        onMain { [weak self] in
            guard let self = self else { return }
            if let id = self.clips.first(where: { $0.value === player })?.key {
                self.emit(flag ? "ended" : "interrupted", id: id,
                          player: player, reason: flag ? "" : "player-failed")
                self.clips.removeValue(forKey: id)
            } else {
                self.cues.removeAll(where: { $0 === player })
            }
        }
    }
    // Source-authored fixed note patterns, synthesized entirely in
    // native RAM. No user-supplied frequency, waveform, path or PCM.
    private func wavData(midi: Int, seconds: Double, gain: Double,
                         square: Bool = false) -> Data {
        let rate = 44_100
        let count = min(22_050, max(512, Int(Double(rate) * seconds)))
        var data = Data()
        func bytes(_ value: String) {
            data.append(contentsOf: value.utf8)
        }
        func word(_ value: UInt16) {
            var le = value.littleEndian
            withUnsafeBytes(of: &le) { data.append(contentsOf: $0) }
        }
        func dword(_ value: UInt32) {
            var le = value.littleEndian
            withUnsafeBytes(of: &le) { data.append(contentsOf: $0) }
        }
        bytes("RIFF"); dword(UInt32(36 + count * 2))
        bytes("WAVEfmt "); dword(16); word(1); word(1)
        dword(UInt32(rate)); dword(UInt32(rate * 2))
        word(2); word(16)
        bytes("data"); dword(UInt32(count * 2))
        let hz = 440 * pow(2, Double(midi - 69) / 12)
        for index in 0..<count {
            let t = Double(index) / Double(rate)
            let phase = (t * hz).truncatingRemainder(dividingBy: 1)
            let wave: Double = square ? (phase < 0.5 ? 1 : -1) :
                (4 * abs(phase - 0.5) - 1)
            let attack = min(1, Double(index) / (0.018 * Double(rate)))
            let release = min(1, Double(count - index) /
                              (0.04 * Double(rate)))
            let sample = max(-1, min(1,
                wave * gain * max(0, min(attack, release))))
            word(UInt16(bitPattern: Int16(sample * 32767)))
        }
        return data
    }
    @objc func playCue(_ call: CAPPluginCall) {
        onMain { [weak self] in
            guard let self = self, self.isDevBundle,
                  self.ownedByReadGesture,
                  UIApplication.shared.applicationState == .active,
                  let kind = call.getString("kind"),
                  ["order", "scramble", "negative"].contains(kind) else {
                call.resolve(["played": false, "reason": "not-ready"])
                return
            }
            let index = min(64, max(1, call.getInt("index") ?? 1))
            let complete = call.getBool("complete") == true
            let wrong = call.getBool("wrong") == true
            let scale = [60, 62, 64, 67, 69, 72]
            let base = scale[(index - 1) % scale.count]
            let notes: [(Int, Double)]
            let gain: Double
            let duration: Double
            let square: Bool
            if kind == "negative" {
                notes = [(48, 0)]; gain = 0.08
                duration = 0.15; square = true
            } else if kind == "order" {
                let midi = wrong ? 48 : base
                notes = wrong ? [(midi, 0)] : complete ?
                    [(midi, 0), (midi + 4, 0.09),
                     (midi + 7, 0.18), (midi + 12, 0.27)] :
                    [(midi, 0)]
                gain = wrong ? 0.11 : 0.22
                duration = wrong ? 0.14 : 0.17
                square = wrong
            } else {
                notes = complete ?
                    [(base, 0), (base + 4, 0.09),
                     (base + 7, 0.19), (base + 12, 0.3)] :
                    [(base, 0), (base + 4, 0.1)]
                gain = 0.22; duration = complete ? 0.2 : 0.17
                square = false
            }
            self.cues.removeAll(where: { !$0.isPlaying })
            while self.cues.count + notes.count > 12 && !self.cues.isEmpty {
                self.cues.removeFirst().stop()
            }
            var scheduled = 0
            for (midi, delay) in notes {
                guard let player = try? AVAudioPlayer(
                    data: self.wavData(midi: midi, seconds: duration,
                                       gain: gain, square: square)) else {
                    continue
                }
                player.delegate = self
                player.prepareToPlay()
                if player.play(atTime: player.deviceCurrentTime + delay) {
                    self.cues.append(player)
                    scheduled += 1
                }
            }
            call.resolve(["played": scheduled == notes.count,
                          "noteCount": scheduled])
        }
    }
    @objc func stopCues(_ call: CAPPluginCall) {
        onMain { [weak self] in
            self?.cues.forEach { $0.stop() }
            self?.cues.removeAll()
            call.resolve(["stopped": true])
        }
    }
}
