// Native age assurance foundation. Deliberately not called by the app yet.
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
                return features.isEmpty ? .notRequired : .needsCheck
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

    // Future native controller owns the presenter and invokes this only when needed.
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
#endif
