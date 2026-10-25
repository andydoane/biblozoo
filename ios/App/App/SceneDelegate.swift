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
