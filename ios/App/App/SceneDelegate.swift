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
        CAPPluginMethod(name: "getCaptureState", returnType: CAPPluginReturnPromise)
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
    private var captureRestoreOK = true

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
        // Real UIKit/OS interruptions MUST stop capture. Never restart in
        // didBecomeActive, route replug, or a generic Welcome Back.
        let center = NotificationCenter.default
        for name in [UIApplication.willResignActiveNotification,
                     UIApplication.didEnterBackgroundNotification,
                     AVAudioSession.interruptionNotification,
                     AVAudioSession.mediaServicesWereLostNotification,
                     AVAudioSession.mediaServicesWereResetNotification] {
            observers.append(center.addObserver(forName: name, object: nil,
                queue: .main) { [weak self] _ in
                    self?.stopProbe(reason: "interrupted")
                    self?.stopCaptureInternal(retain: false,
                                              reason: "interrupted", call: nil)
                })
        }
        observers.append(center.addObserver(
            forName: AVAudioSession.routeChangeNotification, object: nil,
            queue: .main) { [weak self] _ in
                guard let self = self, self.isProbing else { return }
                // Changing category at probe start can itself notify a route
                // change; ignore only that bounded setup settling window.
                if let started = self.startedAt,
                   Date().timeIntervalSince(started) >= 0.5 {
                    self.stopProbe(reason: "route-changed")
                }
                // Input route loss is a real capture cancellation.
                if self.capturePrepared || self.captureRunning {
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
                  !self.captureRunning && self.captureSavedCategory == nil &&
                  !self.requestInFlight else {
                call.resolve(["prepared": false, "reason": "busy"])
                return
            }
            guard session.category == .soloAmbient,
                  !session.isOtherAudioPlaying else {
                call.resolve(["prepared": false, "reason": "unsafe-session-state"])
                return
            }
            self.captureSavedCategory = session.category
            self.captureSavedMode = session.mode
            self.captureSavedOptions = session.categoryOptions
            self.captureRestoreOK = false
            self.captureGeneration += 1
            let captureKey = self.captureGeneration
            self.captureWorker.async {
                self.workerCaptureKey = captureKey
                self.captureSamples.removeAll(keepingCapacity: false)
                self.savedSamples.removeAll(keepingCapacity: false)
                self.savedCaptureKey = -1
            }
            do {
                // N7b owner-tested candidate, used only for explicitly
                // initiated Flashcards capture in the isolated Audio Test.
                // A final production audio-session policy remains N7g-gated.
                try session.setCategory(.playAndRecord, mode: .measurement,
                                        options: [.defaultToSpeaker])
                try session.setActive(true)
                self.capturePrepared = true
                self.captureRunning = false
                self.lastReason = "capture-prepared"
                call.resolve(["prepared": true, "reason": "capture-prepared"])
            } catch {
                self.stopCaptureInternal(retain: false,
                    reason: "prepare-failed", call: nil)
                call.resolve(["prepared": false, "reason": "prepare-failed"])
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
                    }
                }
                self.captureEngine = engine
                try engine.start()
                self.captureSampleRate = sampleRate
                self.captureStartedAt = Date()
                self.captureRunning = true
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
                              "limitMs": self.captureLimitMs])
            } catch {
                self.stopCaptureInternal(retain: false,
                    reason: "engine-start-failed", call: nil)
                call.resolve(["started": false, "reason": "engine-start-failed"])
            }
        }
    }

    // Flush queued input buffers after stopping the microphone, keeping only
    // ONE opaque take in RAM. The original recorded bytes never cross JS
    // bridge; N7d will supply guarded native replay in a separate PR.
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
        captureStartedAt = nil
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
        var deactivated = true
        do {
            try session.setActive(false, options: [.notifyOthersOnDeactivation])
        } catch { deactivated = false }
        var categoryRestored = false
        if let category = category, let mode = mode, let options = options {
            do {
                try session.setCategory(category, mode: mode, options: options)
                categoryRestored = session.category == category &&
                                   session.mode == mode
            } catch { categoryRestored = false }
        }
        captureRestoreOK = deactivated && categoryRestored
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
            } else {
                self.savedSamples.removeAll(keepingCapacity: false)
                self.savedCaptureKey = -1
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
            self.captureGeneration += 1
            self.captureWorker.async { [weak self] in
                guard let self = self else { return }
                self.workerCaptureKey = -1
                self.captureSamples.removeAll(keepingCapacity: false)
                self.savedSamples.removeAll(keepingCapacity: false)
                self.savedCaptureKey = -1
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
                        "restored": self.captureRestoreOK,
                        "reason": self.lastReason
                    ])
                }
            }
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
