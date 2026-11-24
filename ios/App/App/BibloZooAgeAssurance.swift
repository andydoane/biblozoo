// Native age assurance foundation and staged startup integration.
// No persistence, logs, network client, JavaScript bridge, or authorization decision.
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

// One attempt per scene lifetime, even if a system sheet temporarily deactivates
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
    func regulatoryStatus() async -> BibloZooAgeRangeOutcome {
        do {
            if #available(iOS 26.4, *) {
                let features = try await AgeRangeService.shared.requiredRegulatoryFeatures
                let ageRequired = features.contains(.declaredAgeRangeRequired)
                let updateRequired = features.contains(.significantAppChangeRequiresAdultNotification)
                    || features.contains(.significantAppChangeRequiresParentalConsent)
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
                return BibloZooAgeRangeOutcome.regulatoryOutcome(
                    ageRequired: ageRequired, updateRequired: updateRequired,
                    unknownRequirement: unknown
                )
            }
            if #available(iOS 26.2, *) {
                return try await AgeRangeService.shared.isEligibleForAgeFeatures
                    ? .needsCheck : .notRequired
            }
            return .unavailable
        } catch {
            return .unavailable
        }
    }

    // The native startup controller owns the presenter and invokes this only when needed.
    // Status is not an access grant or evidence of minor parental consent.
    func check(in presenter: UIViewController) async -> BibloZooAgeRangeOutcome {
        guard !checking else { return .unavailable }
        checking = true
        defer { checking = false }

        let status = await regulatoryStatus()
        guard status == .needsCheck else { return status }
        guard #available(iOS 26.2, *),
              UIApplication.shared.applicationState == .active,
              presenter.viewIfLoaded?.window != nil,
              presenter.presentedViewController == nil,
              !Task.isCancelled else { return .unavailable }

        do {
            let response = try await AgeRangeService.shared.requestAgeRange(
                ageGates: 18, in: presenter
            )
            guard !Task.isCancelled else { return .unavailable }
            switch response {
            case .declinedSharing:
                return .declined
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
                return BibloZooAgeRangeOutcome.classify(
                    lower: range.lowerBound,
                    upper: range.upperBound,
                    confirmed: confirmed
                )
            @unknown default:
                return .ambiguous
            }
        } catch {
            // Do not retain or expose error details, which may contain account context.
            return .unavailable
        }
    }
}

// Integration is compiled now but calls remain opt-in until the Declared Age
// Range entitlement is actually provisioned. No project build setting enables
// this condition in the current PR. Never enable it on a family-device build
// until access policy and signed sandbox testing are approved.
@MainActor
final class BibloZooAgeStartupCoordinator {
    private var attempt = BibloZooAgeStartupAttempt()
    private let service = BibloZooAgeAssurance()
    private var task: Task<Void, Never>?

    private static var liveEnabled: Bool {
        #if BIBLOZOO_AGE_ASSURANCE_LIVE
        return true
        #else
        return false
        #endif
    }

    func sceneBecameActive(_ scene: UIScene, presenter: UIViewController?) {
        guard let presenter = presenter,
              scene.activationState == .foregroundActive,
              UIApplication.shared.applicationState == .active,
              presenter.viewIfLoaded?.window?.windowScene === scene,
              presenter.presentedViewController == nil,
              !presenter.isBeingDismissed else { return }
        guard attempt.begin(bundleID: Bundle.main.bundleIdentifier,
                            liveEnabled: Self.liveEnabled,
                            activePresenter: true) else { return }

        task = Task { @MainActor [weak self, weak presenter] in
            guard let self = self else { return }
            defer { self.task = nil }
            guard let presenter = presenter, !Task.isCancelled,
                  scene.activationState == .foregroundActive,
                  UIApplication.shared.applicationState == .active,
                  presenter.viewIfLoaded?.window?.windowScene === scene,
                  presenter.presentedViewController == nil else { return }
            // Phase 2a is integration only. A later native access coordinator
            // must consume this result, apply consent policy and handle updates.
            // No result is retained or used as authorization in this phase.
            _ = await self.service.check(in: presenter)
        }
    }

    func sceneLeftForeground() {
        // Do not cancel on willResignActive: Apple's own sheet may cause that.
        // A true background/disconnect cancels pending work; do not reprompt
        // automatically in this scene. No stale completion can unlock anything.
        task?.cancel()
    }
}
#endif
