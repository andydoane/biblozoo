import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

// Patch 58: opt-in, read-only iOS audio-session diagnostics.
// This bridge intentionally NEVER invokes setActive, setCategory, setMode,
// audio playback, recording, or interruption recovery.
import AVFAudio

@objc(BibloZooAudioSessionDiagnosticsPlugin)
final class BibloZooAudioSessionDiagnosticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BibloZooAudioSessionDiagnosticsPlugin"
    public let jsName = "BibloZooAudioSessionDiagnostics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "enable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "snapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getEvents", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disable", returnType: CAPPluginReturnPromise)
    ]

    private let maximumEvents = 120
    private var enabled = false
    private var nextSequence = 0
    private var events: [[String: Any]] = []
    private var observers: [NSObjectProtocol] = []

    private func onMain(_ work: @escaping () -> Void) {
        if Thread.isMainThread { work() } else { DispatchQueue.main.async(execute: work) }
    }

    private func timestamp() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: Date())
    }

    // Reading AVAudioSession properties is observational. An audio session has
    // no public isActive boolean, so this deliberately does not infer one.
    private func snapshotFields() -> [String: Any] {
        let session = AVAudioSession.sharedInstance()
        return [
            "category": session.category.rawValue,
            "mode": session.mode.rawValue,
            "categoryOptions": Int(session.categoryOptions.rawValue),
            "otherAudioPlaying": session.isOtherAudioPlaying,
            "secondaryAudioSilenced": session.secondaryAudioShouldBeSilencedHint,
            "outputPorts": session.currentRoute.outputs.map { $0.portType.rawValue }
        ]
    }

    private func append(_ type: String, extra: [String: Any] = [:]) {
        guard enabled else { return }
        nextSequence += 1
        var entry: [String: Any] = [
            "type": "native-audio-" + type,
            "time": timestamp(),
            "sequence": nextSequence
        ]
        for (key, value) in snapshotFields() { entry[key] = value }
        for (key, value) in extra { entry[key] = value }
        events.append(entry)
        if events.count > maximumEvents { events.removeFirst(events.count - maximumEvents) }
    }

    private func installObservers() {
        let center = NotificationCenter.default
        func observe(_ name: Notification.Name, _ callback: @escaping (Notification) -> Void) {
            observers.append(center.addObserver(forName: name, object: nil, queue: .main, using: callback))
        }
        observe(AVAudioSession.interruptionNotification) { [weak self] notification in
            let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? NSNumber
            let interruptionType: String
            switch raw?.uintValue {
            case AVAudioSession.InterruptionType.began.rawValue: interruptionType = "began"
            case AVAudioSession.InterruptionType.ended.rawValue: interruptionType = "ended"
            default: interruptionType = "unknown"
            }
            let optionsRaw = (notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? NSNumber)?.uintValue ?? 0
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsRaw)
            self?.append("interruption", extra: [
                "interruptionType": interruptionType,
                "shouldResume": options.contains(.shouldResume)
            ])
        }
        observe(AVAudioSession.routeChangeNotification) { [weak self] notification in
            let reason = (notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? NSNumber)?.intValue ?? -1
            self?.append("route-change", extra: ["routeChangeReason": reason])
        }
        observe(AVAudioSession.mediaServicesWereLostNotification) { [weak self] _ in
            self?.append("media-services-lost")
        }
        observe(AVAudioSession.mediaServicesWereResetNotification) { [weak self] _ in
            self?.append("media-services-reset")
        }
        observe(AVAudioSession.silenceSecondaryAudioHintNotification) { [weak self] notification in
            let hint = (notification.userInfo?[AVAudioSessionSilenceSecondaryAudioHintTypeKey] as? NSNumber)?.intValue ?? -1
            self?.append("secondary-hint", extra: ["hintType": hint])
        }
        observe(UIApplication.willResignActiveNotification) { [weak self] _ in
            self?.append("app-inactive")
        }
        observe(UIApplication.didBecomeActiveNotification) { [weak self] _ in
            self?.append("app-active")
        }
        observe(UIApplication.didEnterBackgroundNotification) { [weak self] _ in
            self?.append("app-background")
        }
        observe(UIApplication.willEnterForegroundNotification) { [weak self] _ in
            self?.append("app-foreground")
        }
    }

    private func stopObservers() {
        for token in observers { NotificationCenter.default.removeObserver(token) }
        observers.removeAll()
    }

    @objc func enable(_ call: CAPPluginCall) {
        onMain {
            if !self.enabled {
                self.enabled = true
                self.installObservers()
                self.append("snapshot", extra: ["label": "enabled"])
            }
            call.resolve(["enabled": self.enabled])
        }
    }

    @objc func snapshot(_ call: CAPPluginCall) {
        onMain {
            // Restrict labels to known diagnostic markers, not user content.
            let requested = call.getString("label") ?? "manual"
            let allowed: Set<String> = [
                "manual", "export", "foreground", "resume-attempt", "resume-failed", "resume-verified"
            ]
            self.append("snapshot", extra: ["label": allowed.contains(requested) ? requested : "manual"])
            call.resolve()
        }
    }

    @objc func getEvents(_ call: CAPPluginCall) {
        onMain {
            let since = max(0, call.getInt("since") ?? 0)
            call.resolve(["events": self.events.filter { ($0["sequence"] as? Int ?? 0) > since }])
        }
    }

    @objc func clear(_ call: CAPPluginCall) {
        onMain {
            self.events.removeAll()
            call.resolve()
        }
    }

    @objc func disable(_ call: CAPPluginCall) {
        onMain {
            self.stopObservers()
            self.enabled = false
            self.events.removeAll()
            call.resolve()
        }
    }

    deinit { stopObservers() }
}
