// Native-only age assurance, staged access policy and startup shell.
// No persistence, logs, network client, JavaScript bridge or raw age retention.
import Foundation

enum BibloZooAgeRangeOutcome: Equatable {
    case minor
    case confirmedAdult
    case adultNotConfirmed
    case ambiguous
    case declined
    case unavailable
    case notRequired
    case needsCheck
    case updateRequirementsOnly

    // An update-only obligation is not permission to skip that separate flow,
    // and is not itself a reason to ask for an age range at first launch.
    static func regulatoryOutcome(ageRequired: Bool, updateRequired: Bool,
                                  unknownRequirement: Bool) -> Self {
        if ageRequired { return .needsCheck }
        if unknownRequirement { return .unavailable }
        return updateRequired ? .updateRequirementsOnly : .notRequired
    }

    // Required regional categories: under 13, 13–15, 16–17, 18+.
    // A minor result spanning categories is not a verified category.
    static func classifyRegulated(lower: Int?, upper: Int?, confirmed: Bool) -> Self {
        let outcome = classify(lower: lower, upper: upper, confirmed: confirmed)
        guard outcome == .minor, let upper = upper else { return outcome }
        if upper < 13 { return .minor }
        guard let lower = lower else { return .ambiguous }
        if lower >= 13 && upper < 16 { return .minor }
        if lower >= 16 && upper < 18 { return .minor }
        return .ambiguous
    }

    // Apple supplies inclusive bounds. nil can represent an open end.
    // Never assume that absent, contradictory, or straddling bounds mean adult.
    static func classify(lower: Int?, upper: Int?, confirmed: Bool) -> Self {
        if let lower = lower, lower < 0 { return .ambiguous }
        if let upper = upper, upper < 0 { return .ambiguous }
        if let lower = lower, let upper = upper, lower > upper { return .ambiguous }
        if let upper = upper, upper < 18 { return .minor }
        if let lower = lower, lower >= 18 {
            return confirmed ? .confirmedAdult : .adultNotConfirmed
        }
        return .ambiguous
    }
}

// Transient inputs for policy evaluation; no bounds, identifiers or proof data.
struct BibloZooAgeAssessment: Equatable {
    let outcome: BibloZooAgeRangeOutcome
    let adultUpdateNotice: Bool
    let minorUpdateConsent: Bool
    let unknownRequirement: Bool

    init(_ outcome: BibloZooAgeRangeOutcome, adultUpdateNotice: Bool = false,
         minorUpdateConsent: Bool = false, unknownRequirement: Bool = false) {
        self.outcome = outcome
        self.adultUpdateNotice = adultUpdateNotice
        self.minorUpdateConsent = minorUpdateConsent
        self.unknownRequirement = unknownRequirement
    }

    func withOutcome(_ outcome: BibloZooAgeRangeOutcome) -> Self {
        Self(outcome, adultUpdateNotice: adultUpdateNotice,
             minorUpdateConsent: minorUpdateConsent,
             unknownRequirement: unknownRequirement)
    }
}

enum BibloZooInitialConsent {
    case unknown
    case verified
    case deniedOrRevoked
}

enum BibloZooUpdateState {
    case firstReleaseNoPending
    case verifiedNoPending
    case pending
    case approved
    case denied
    case unknown
}

enum BibloZooAgeAccessDecision: Equatable {
    case allowChildSafe
    case holdAgeVerification
    case holdInitialConsent
    case holdUpdate
    case holdUnavailable
    case holdDenied

    // This staged policy is intentionally conservative. An age range,
    // parental-controls setting or successful install is NOT consent proof.
    // Only a separately verified store consent signal can supply .verified.
    static func evaluate(_ assessment: BibloZooAgeAssessment,
                         initialConsent: BibloZooInitialConsent,
                         update: BibloZooUpdateState) -> Self {
        if case .deniedOrRevoked = initialConsent { return .holdDenied }
        if case .denied = update { return .holdDenied }
        guard !assessment.unknownRequirement else { return .holdUnavailable }

        switch assessment.outcome {
        case .notRequired, .updateRequirementsOnly, .confirmedAdult:
            break
        case .minor:
            guard case .verified = initialConsent else { return .holdInitialConsent }
        case .adultNotConfirmed, .ambiguous, .declined:
            return .holdAgeVerification
        case .unavailable, .needsCheck:
            return .holdUnavailable
        }

        switch update {
        case .firstReleaseNoPending, .verifiedNoPending:
            // For an update-only region, no age request is required merely
            // because a future significant update may require consent.
            return .allowChildSafe
        case .approved:
            // Approval is only supplied by a future version-scoped verified
            // update flow; never infer it from a general age-range result.
            return .allowChildSafe
        case .pending:
            return .holdUpdate
        case .unknown:
            return .holdUnavailable
        case .denied:
            return .holdDenied
        }
    }
}

// One automatic attempt per scene lifetime, even if a system sheet temporarily deactivates
// the scene. No age data, approval or access decision is retained by this gate.
struct BibloZooAgeStartupAttempt {
    private(set) var attempted = false

    mutating func begin(bundleID: String?, liveEnabled: Bool,
                        activePresenter: Bool) -> Bool {
        guard !attempted, liveEnabled, activePresenter,
              bundleID == "com.andydoane.biblozoo" else { return false }
        attempted = true
        return true
    }
}

#if os(iOS) && canImport(DeclaredAgeRange)
import UIKit
import DeclaredAgeRange

@MainActor
final class BibloZooAgeAssurance {
    private var checking = false

    // No age request when the platform reports no applicable requirements.
    // Older systems and errors are intentionally distinct from notRequired.
    func regulatoryStatus() async -> BibloZooAgeAssessment {
        do {
            if #available(iOS 26.4, *) {
                let features = try await AgeRangeService.shared.requiredRegulatoryFeatures
                let ageRequired = features.contains(.declaredAgeRangeRequired)
                let adultNotice = features.contains(.significantAppChangeRequiresAdultNotification)
                let minorConsent = features.contains(.significantAppChangeRequiresParentalConsent)
                let updateRequired = adultNotice || minorConsent
                let unknown = features.contains { feature in
                    switch feature {
                    case .declaredAgeRangeRequired,
                         .significantAppChangeRequiresAdultNotification,
                         .significantAppChangeRequiresParentalConsent:
                        return false
                    @unknown default:
                        return true
                    }
                }
                return BibloZooAgeAssessment(
                    BibloZooAgeRangeOutcome.regulatoryOutcome(
                        ageRequired: ageRequired, updateRequired: updateRequired,
                        unknownRequirement: unknown
                    ), adultUpdateNotice: adultNotice, minorUpdateConsent: minorConsent,
                    unknownRequirement: unknown
                )
            }
            if #available(iOS 26.2, *) {
                let eligible = try await AgeRangeService.shared.isEligibleForAgeFeatures
                return BibloZooAgeAssessment(eligible ? .needsCheck : .notRequired)
            }
            return BibloZooAgeAssessment(.unavailable)
        } catch {
            return BibloZooAgeAssessment(.unavailable)
        }
    }

    // The native startup controller owns the presenter and invokes this only when needed.
    // Status is not an access grant or evidence of minor parental consent.
    func check(in presenter: UIViewController) async -> BibloZooAgeAssessment {
        guard !checking else { return BibloZooAgeAssessment(.unavailable) }
        checking = true
        defer { checking = false }

        let status = await regulatoryStatus()
        guard status.outcome == .needsCheck else { return status }
        guard #available(iOS 26.2, *),
              UIApplication.shared.applicationState == .active,
              presenter.viewIfLoaded?.window != nil,
              presenter.presentedViewController == nil,
              !Task.isCancelled else { return status.withOutcome(.unavailable) }

        do {
            let response = try await AgeRangeService.shared.requestAgeRange(
                ageGates: 13, 16, 18, in: presenter
            )
            guard !Task.isCancelled else { return status.withOutcome(.unavailable) }
            switch response {
            case .declinedSharing:
                return status.withOutcome(.declined)
            case .sharing(let range):
                let confirmed: Bool
                if #available(iOS 26.5, *) {
                    confirmed = range.ageRangeDeclaration == .confirmed
                } else {
                    // Only recognized legacy confirmation methods. Unknown methods
                    // are conservatively not classified as confirmed.
                    confirmed = range.ageRangeDeclaration == .paymentChecked
                        || range.ageRangeDeclaration == .governmentIDChecked
                }
                return status.withOutcome(BibloZooAgeRangeOutcome.classifyRegulated(
                    lower: range.lowerBound,
                    upper: range.upperBound,
                    confirmed: confirmed
                ))
            @unknown default:
                return status.withOutcome(.ambiguous)
            }
        } catch {
            // Do not retain or expose error details, which may contain account context.
            return status.withOutcome(.unavailable)
        }
    }
}

// Compiled but disabled in all tracked configurations. This is a test-only
// gate until native consent evidence, update flows, older-OS/offline policy,
// entitlement, lifecycle and sandbox acceptance have been completed.
@MainActor
final class BibloZooAgeStartupCoordinator {
    private var attempt = BibloZooAgeStartupAttempt()
    private let service = BibloZooAgeAssurance()
    private var task: Task<Void, Never>?

    static var useNativeGate: Bool {
        #if BIBLOZOO_AGE_ASSURANCE_LIVE
        return Bundle.main.bundleIdentifier == "com.andydoane.biblozoo"
        #else
        return false
        #endif
    }

    func sceneBecameActive(_ scene: UIScene, presenter: BibloZooAgeGateViewController,
                           completion: @escaping (BibloZooAgeAccessDecision) -> Void) {
        guard task == nil, scene.activationState == .foregroundActive,
              UIApplication.shared.applicationState == .active,
              presenter.viewIfLoaded?.window?.windowScene === scene,
              presenter.presentedViewController == nil,
              !presenter.isBeingDismissed else { return }
        guard attempt.begin(bundleID: Bundle.main.bundleIdentifier,
                            liveEnabled: Self.useNativeGate,
                            activePresenter: true) else { return }
        presenter.showChecking()

        task = Task { @MainActor [weak self, weak presenter] in
            guard let self = self else { return }
            defer { self.task = nil }
            guard let presenter = presenter, !Task.isCancelled,
                  scene.activationState == .foregroundActive,
                  UIApplication.shared.applicationState == .active,
                  presenter.viewIfLoaded?.window?.windowScene === scene,
                  presenter.presentedViewController == nil else {
                completion(.holdUnavailable)
                return
            }
            // 1.0 has not previously shipped on the App Store. Do not assume
            // later versions are first release or invent a significant update.
            let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
            let update: BibloZooUpdateState = version == "1.0" ? .firstReleaseNoPending : .unknown
            let assessment = await self.service.check(in: presenter)
            guard !Task.isCancelled,
                  scene.activationState == .foregroundActive,
                  UIApplication.shared.applicationState == .active,
                  presenter.viewIfLoaded?.window?.windowScene === scene,
                  presenter.presentedViewController == nil else {
                completion(.holdUnavailable)
                return
            }
            // No native proof of initial minor consent has yet been wired.
            // This MUST NOT change to verified just because the app is installed.
            // Future code must supply verified store evidence, or stay blocked.
            let decision = BibloZooAgeAccessDecision.evaluate(
                assessment, initialConsent: .unknown, update: update)
            completion(decision)
        }
    }

    func retry(_ scene: UIScene, presenter: BibloZooAgeGateViewController,
               completion: @escaping (BibloZooAgeAccessDecision) -> Void) {
        guard task == nil else { return }
        // Only an explicit native button tap can authorize another attempt.
        attempt = BibloZooAgeStartupAttempt()
        sceneBecameActive(scene, presenter: presenter, completion: completion)
    }

    func sceneLeftForeground() {
        // An Apple sheet may cause willResignActive; only true background or
        // disconnect cancels. A cancelled completion cannot authorize access.
        task?.cancel()
    }
}

// Native placeholder exists before WKWebView creation, so no child-facing
// content or JS bridge is loaded while this staged gate is unresolved.
@MainActor
final class BibloZooAgeGateViewController: UIViewController {
    var onRetry: (() -> Void)?
    private let message = UILabel()
    private let retryButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        message.font = .preferredFont(forTextStyle: .body)
        message.adjustsFontForContentSizeCategory = true
        message.textColor = .label
        message.textAlignment = .center
        message.numberOfLines = 0
        retryButton.setTitle("Try Again", for: .normal)
        retryButton.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        retryButton.titleLabel?.adjustsFontForContentSizeCategory = true
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        let stack = UIStackView(arrangedSubviews: [message, retryButton])
        stack.axis = .vertical
        stack.spacing = 20
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            stack.centerYAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerYAnchor),
            retryButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 44)
        ])
        showChecking()
    }

    func showChecking() {
        message.text = "Checking App Store requirements…"
        retryButton.isHidden = true
    }

    func showHold(_ decision: BibloZooAgeAccessDecision) {
        // No raw age, identifiers, or detailed API errors in UI or diagnostics.
        switch decision {
        case .holdAgeVerification:
            message.text = "Ask a grown-up to check the age-sharing settings for this Apple Account."
        case .holdInitialConsent:
            message.text = "App Store permission could not be confirmed. Ask a grown-up for help."
        case .holdUpdate:
            message.text = "Permission for this app update is needed."
        case .holdDenied:
            message.text = "App Store permission is not available."
        case .holdUnavailable, .allowChildSafe:
            message.text = "The required App Store check is unavailable. Ask a grown-up or try again."
        }
        retryButton.isHidden = false
    }

    @objc private func retryTapped() { onRetry?() }
}
#endif
