// Native-only age assurance, staged access policy and startup shell.
// No app persistence, network client, JavaScript bridge or raw age retention.
// Only the isolated device sandbox emits coarse console diagnostics.
import Foundation

// A staged gate with unresolved release prerequisites must never silently
// become a distribution build. Remove this fence only in an explicitly
// reviewed release-activation PR after the roadmap's stop/go checks.
#if BIBLOZOO_AGE_ASSURANCE_LIVE && !DEBUG
#error("BibloZoo age assurance is not approved for live Release activation.")
#endif
#if BIBLOZOO_AGE_ASSURANCE_FIXTURE && (!DEBUG || !targetEnvironment(simulator) || !os(iOS))
#error("BibloZoo age fixtures are restricted to iOS Debug simulator builds.")
#endif
#if BIBLOZOO_AGE_ASSURANCE_FIXTURE && BIBLOZOO_AGE_ASSURANCE_LIVE
#error("BibloZoo fixture and live age assurance modes are mutually exclusive.")
#endif

// Sandbox requests real Apple APIs using a separate development-signed
// identity; never use this flag in a simulator, Release, or another mode.
#if BIBLOZOO_AGE_ASSURANCE_SANDBOX && (!DEBUG || targetEnvironment(simulator) || !os(iOS))
#error("BibloZoo age sandbox is restricted to iOS Debug physical-device builds.")
#endif
#if BIBLOZOO_AGE_ASSURANCE_SANDBOX && (BIBLOZOO_AGE_ASSURANCE_LIVE || BIBLOZOO_AGE_ASSURANCE_FIXTURE)
#error("BibloZoo age sandbox is mutually exclusive with live and fixture modes.")
#endif

enum BibloZooAgeRangeOutcome: Equatable {
    case minor
    case confirmedAdult
    case adultNotConfirmed
    case ambiguous
    case declined
    case unavailable
    case unsupportedPlatform
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

// StoreKit's app rating code is opaque metadata, not a person's age,
// approval or evidence that an update is pending. A development zero is
// not usable as a production baseline. Nothing here stores a baseline.
enum BibloZooAppRatingComparison: Equatable {
    case inactive
    case unsupportedPlatform
    case unavailable
    case baselineMissing
    case unchanged
    case changed

    static func evaluate(enabled: Bool, supported: Bool, previous: Int?,
                         current: Int?, cancelled: Bool) -> Self {
        guard enabled else { return .inactive }
        guard !cancelled else { return .unavailable }
        guard supported else { return .unsupportedPlatform }
        guard let current = current, current != 0 else { return .unavailable }
        guard let previous = previous, previous != 0 else { return .baselineMissing }
        return previous == current ? .unchanged : .changed
    }
}

enum BibloZooInitialConsent {
    case unknown
    case verified
    case deniedOrRevoked
}

enum BibloZooUpdateState: Equatable {
    case firstReleaseNoPending
    case verifiedNoPending
    case pending
    case approved
    case denied
    case unknown
}

// A real, version-specific update is a prerequisite, never generated by
// age sharing or the first release. No question or response is persisted.
struct BibloZooSignificantUpdate: Equatable {
    let version: String
    let description: String

    func isValid(for installedVersion: String?) -> Bool {
        guard let installedVersion = installedVersion,
              installedVersion == version, version != "1.0" else { return false }
        return !description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

// Pure authorization predicate for the one-off device experiment. No API or
// persistence here. The actual caller additionally has a physical Debug fence.
enum BibloZooUpdateSandboxPlan {
    static let argument = "--biblozoo-test-significant-update"
    static func permits(sandbox: Bool, bundleID: String?, version: String?,
                        arguments: [String]) -> Bool {
        sandbox && bundleID == "com.andydoane.biblozoo.agesandbox"
            && version == "1.1" && arguments.contains(argument)
    }

    // An experiment never opens the WebView, including after approval.
    // Unknown initial minor consent remains unknown.
    static func barrier(_ assessment: BibloZooAgeAssessment,
                        result: BibloZooUpdateState) -> BibloZooAgeAccessDecision {
        let policy = BibloZooAgeAccessDecision.evaluate(
            assessment, initialConsent: .unknown, update: result)
        return policy == .allowChildSafe ? .holdUpdate : policy
    }
}

enum BibloZooUpdateRoute: Equatable {
    case noPrompt
    case needsAge
    case adultAcknowledgment
    case parentalPermission
    case unavailable

    static func resolve(_ assessment: BibloZooAgeAssessment,
                        pending: BibloZooSignificantUpdate?,
                        installedVersion: String?) -> Self {
        guard !assessment.unknownRequirement else { return .unavailable }
        guard let pending = pending else { return .noPrompt }
        guard pending.isValid(for: installedVersion) else { return .unavailable }
        switch assessment.outcome {
        case .notRequired:
            return .noPrompt
        case .updateRequirementsOnly, .needsCheck:
            return .needsAge
        case .confirmedAdult:
            return assessment.adultUpdateNotice ? .adultAcknowledgment : .noPrompt
        case .minor:
            return assessment.minorUpdateConsent ? .parentalPermission : .noPrompt
        case .adultNotConfirmed, .ambiguous, .declined, .unavailable, .unsupportedPlatform:
            return .unavailable
        }
    }
}

// Correlate responses to this exact in-memory request. A successful send,
// a default answer, an unrelated response or a cancelled task is not approval.
enum BibloZooUpdateReply: Equatable {
    case approved
    case denied
    case unknown
}

struct BibloZooUpdateResponseMatch {
    static func evaluate(expectedID: UUID, responseID: UUID,
                         reply: BibloZooUpdateReply, cancelled: Bool) -> BibloZooUpdateState? {
        guard !cancelled, expectedID == responseID else { return nil }
        switch reply {
        case .approved: return .approved
        case .denied: return .denied
        case .unknown: return .unknown
        }
    }
}

enum BibloZooAgeAccessDecision: Equatable {
    case allowChildSafe
    case holdAgeVerification
    case holdInitialConsent
    case holdUpdate
    case holdUnavailable
    case holdUnsupportedPlatform
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
        case .unsupportedPlatform:
            return .holdUnsupportedPlatform
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

// Foreground-scoped transient authorization. A previously allowed scene is
// never allowed to return on an old decision after a true background event.
// Tickets are random in-memory correlation values, not account identifiers.
struct BibloZooAgeForegroundEpoch {
    private(set) var current: UUID?
    private(set) var authorized = false

    mutating func begin() -> UUID? {
        guard current == nil, !authorized else { return nil }
        let ticket = UUID()
        current = ticket
        return ticket
    }

    mutating func finish(_ ticket: UUID, decision: BibloZooAgeAccessDecision,
                         foreground: Bool, cancelled: Bool) -> BibloZooAgeAccessDecision? {
        guard current == ticket else { return nil }
        current = nil
        let result = foreground && !cancelled ? decision : .holdUnavailable
        authorized = result == .allowChildSafe
        return result
    }

    // Return whether this was a granted session requiring a fresh check.
    // An interrupted initial request instead waits for explicit Retry.
    mutating func invalidate() -> Bool {
        let wasAuthorized = authorized
        current = nil
        authorized = false
        return wasAuthorized
    }
}

// Bounded preflight only: readiness is not an age/consent decision. The
// coordinator checks the real UIKit conditions again before issuing a ticket.
// Twenty 100 ms waits let the initial scene/window activation settle without
// leaving the native gate in a permanent checking state.
struct BibloZooAgeStartupReadiness {
    enum Step: Equatable { case start, wait, hold }
    private(set) var remainingWaits: Int

    init(maxWaits: Int = 20) {
        remainingWaits = max(0, maxWaits)
    }

    mutating func next(ready: Bool) -> Step {
        if ready { return .start }
        guard remainingWaits > 0 else { return .hold }
        remainingWaits -= 1
        return .wait
    }
}

// One automatic attempt per foreground authorization cycle, even if a system sheet temporarily deactivates
// the scene. No age data, approval or access decision is retained by this gate.
struct BibloZooAgeStartupAttempt {
    private(set) var attempted = false

    mutating func begin(bundleID: String?, liveEnabled: Bool,
                        activePresenter: Bool, fixtureEnabled: Bool = false,
                        sandboxEnabled: Bool = false) -> Bool {
        let liveIdentity = liveEnabled && !fixtureEnabled && !sandboxEnabled && bundleID == "com.andydoane.biblozoo"
        #if DEBUG
        let fixtureIdentity = fixtureEnabled && !liveEnabled && !sandboxEnabled && bundleID == "com.andydoane.biblozoo.agefixture"
        let sandboxIdentity = sandboxEnabled && !liveEnabled && !fixtureEnabled && bundleID == "com.andydoane.biblozoo.agesandbox"
        #else
        let fixtureIdentity = false
        let sandboxIdentity = false
        #endif
        guard !attempted, activePresenter, liveIdentity || fixtureIdentity || sandboxIdentity else { return false }
        attempted = true
        return true
    }

    // A preflight timeout or true background requires an explicit Retry,
    // even if no actual age request was issued yet.
    mutating func requireExplicitRetry() { attempted = true }
}

#if DEBUG
// Synthetic test inputs only. Never evidence about a real Apple Account.
// The runtime caller is separately restricted to the simulator fixture flag
// and isolated bundle. Pure logic is available to the macOS Debug test.
enum BibloZooAgeFixture: String, CaseIterable {
    case allow, adult, minorApproved = "minor-approved", minorUnknown = "minor-unknown"
    case declined, denied, unavailable, unsupported, updatePending = "update-pending"
    case retryAllow = "retry-allow", reentryDenied = "reentry-denied", slowAllow = "slow-allow"

    static func select(arguments: [String]) -> Self {
        let prefix = "--biblozoo-age-fixture="
        let matches = arguments.filter { $0.hasPrefix(prefix) }
        guard matches.count == 1,
              let fixture = Self(rawValue: String(matches[0].dropFirst(prefix.count))) else {
            return .unavailable
        }
        return fixture
    }

    func decision(at attempt: Int) -> BibloZooAgeAccessDecision {
        var outcome: BibloZooAgeRangeOutcome = .unavailable
        var consent: BibloZooInitialConsent = .unknown
        var update: BibloZooUpdateState = .firstReleaseNoPending
        switch self {
        case .allow, .slowAllow: outcome = .notRequired
        case .adult: outcome = .confirmedAdult
        case .minorApproved: outcome = .minor; consent = .verified
        case .minorUnknown: outcome = .minor
        case .declined: outcome = .declined
        case .denied: outcome = .minor; consent = .deniedOrRevoked
        case .unavailable: break
        case .unsupported: outcome = .unsupportedPlatform
        case .updatePending: outcome = .confirmedAdult; update = .pending
        case .retryAllow: outcome = attempt > 1 ? .notRequired : .unavailable
        case .reentryDenied:
            outcome = attempt > 1 ? .minor : .notRequired
            if attempt > 1 { consent = .deniedOrRevoked }
        }
        return BibloZooAgeAccessDecision.evaluate(
            BibloZooAgeAssessment(outcome), initialConsent: consent, update: update)
    }
}
#endif

#if os(iOS) && canImport(DeclaredAgeRange)
import UIKit
import CoreText
import DeclaredAgeRange
#if canImport(StoreKit)
import StoreKit
#endif
#if canImport(PermissionKit)
import PermissionKit
#endif

#if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
@MainActor
private enum BibloZooAgeSandboxTrace {
    // The console is an explicit test surface, not app-owned storage.
    // Only fixed policy enums and booleans; never raw Apple responses/errors.
    private static var enabled: Bool {
        Bundle.main.bundleIdentifier == "com.andydoane.biblozoo.agesandbox"
    }

    static func regulatory(_ status: BibloZooAgeAssessment) {
        guard enabled else { return }
        print("[BibloZooAgeSandbox] regulatory=\(status.outcome) adultNotice=\(status.adultUpdateNotice) minorConsent=\(status.minorUpdateConsent) unknown=\(status.unknownRequirement)")
    }

    enum RequestEvent: String {
        case skippedRegulatory, skippedPresenter, attempted, cancelled, completed, failed, skippedBusy
    }

    static func request(_ event: RequestEvent) {
        guard enabled else { return }
        print("[BibloZooAgeSandbox] request=\(event.rawValue)")
    }

    static func evaluated(_ outcome: BibloZooAgeRangeOutcome, decision: BibloZooAgeAccessDecision) {
        guard enabled else { return }
        print("[BibloZooAgeSandbox] classification=\(outcome) policy=\(decision)")
    }

    static func finished(_ decision: BibloZooAgeAccessDecision) {
        guard enabled else { return }
        print("[BibloZooAgeSandbox] applied=\(decision)")
    }

    static func updateRoute(_ route: BibloZooUpdateRoute) {
        guard enabled else { return }
        print("[BibloZooAgeSandbox] updateRoute=\(route)")
    }

    enum UpdateEvent: String {
        case started, pending, finished, repeated, invalidVersion
    }
    static func updateEvent(_ event: UpdateEvent) {
        guard enabled else { return }
        print("[BibloZooAgeSandbox] updateEvent=\(event.rawValue)")
    }
    static func updateResult(_ result: BibloZooUpdateState) {
        guard enabled else { return }
        print("[BibloZooAgeSandbox] updateResult=\(result)")
    }

    static func discarded() {
        guard enabled else { return }
        print("[BibloZooAgeSandbox] discarded=true")
    }
}
#endif

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
            // The framework is unavailable for regional checks on this OS.
            // Apple discusses existing accounts on iOS 18 or earlier, but we
            // cannot identify that account cohort from the OS version alone.
            return BibloZooAgeAssessment(.unsupportedPlatform)
        } catch {
            // This could be temporary or offline; do not infer region, age,
            // consent, or even connectivity from an unspecified system error.
            return BibloZooAgeAssessment(.unavailable)
        }
    }

    // The native startup controller owns the presenter and invokes this only when needed.
    // Status is not an access grant or evidence of minor parental consent.
    func check(in presenter: UIViewController) async -> BibloZooAgeAssessment {
        guard !checking else {
            #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
            BibloZooAgeSandboxTrace.request(.skippedBusy)
            #endif
            return BibloZooAgeAssessment(.unavailable)
        }
        checking = true
        defer { checking = false }

        let status = await regulatoryStatus()
        #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
        BibloZooAgeSandboxTrace.regulatory(status)
        #endif
        guard status.outcome == .needsCheck else {
            #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
            BibloZooAgeSandboxTrace.request(.skippedRegulatory)
            #endif
            return status
        }
        guard #available(iOS 26.2, *),
              UIApplication.shared.applicationState == .active,
              presenter.viewIfLoaded?.window != nil,
              presenter.presentedViewController == nil,
              !Task.isCancelled else {
            #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
            BibloZooAgeSandboxTrace.request(.skippedPresenter)
            #endif
            return status.withOutcome(.unavailable)
        }

        do {
            #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
            BibloZooAgeSandboxTrace.request(.attempted)
            #endif
            let response = try await AgeRangeService.shared.requestAgeRange(
                ageGates: 13, 16, 18, in: presenter
            )
            guard !Task.isCancelled else {
                #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
                BibloZooAgeSandboxTrace.request(.cancelled)
                #endif
                return status.withOutcome(.unavailable)
            }
            #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
            BibloZooAgeSandboxTrace.request(.completed)
            #endif
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
            #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
            BibloZooAgeSandboxTrace.request(.failed)
            #endif
            return status.withOutcome(.unavailable)
        }
    }
}

// Compile-only staged native reader; no launch, fixture, UI or update caller.
// The previous value must eventually come from a separately reviewed,
// trustworthy app-rating baseline. Never derive it from a child's age,
// local profiles, the listing draft or a development StoreKit zero.
#if canImport(StoreKit)
@MainActor
enum BibloZooAppRatingService {
    static func compare(previous: Int?) async -> BibloZooAppRatingComparison {
        guard BibloZooAgeStartupCoordinator.useNativeGate else { return .inactive }
        guard !Task.isCancelled else { return .unavailable }
        guard #available(iOS 26.2, *) else { return .unsupportedPlatform }
        let current = await AppStore.ageRatingCode
        return BibloZooAppRatingComparison.evaluate(
            enabled: BibloZooAgeStartupCoordinator.useNativeGate,
            supported: true, previous: previous, current: current,
            cancelled: Task.isCancelled)
    }
}
#endif

// Staged system adapter for real significant updates and the explicit 1.1
// device sandbox experiment only. No production launch caller; account-scoped
// durable approval/recovery and initial consent remain open.
@MainActor
final class BibloZooSignificantUpdateService {
    private var busy = false

    private var permitted: Bool {
        if BibloZooAgeStartupCoordinator.useNativeGate { return true }
        #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
        return BibloZooUpdateSandboxPlan.permits(
            sandbox: BibloZooAgeStartupCoordinator.useSandboxGate,
            bundleID: Bundle.main.bundleIdentifier,
            version: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String,
            arguments: ProcessInfo.processInfo.arguments)
        #else
        return false
        #endif
    }

    func acknowledgeAdult(_ change: BibloZooSignificantUpdate,
                          assessment: BibloZooAgeAssessment,
                          in scene: UIWindowScene) async -> BibloZooUpdateState {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        guard !busy, permitted,
              BibloZooUpdateRoute.resolve(assessment, pending: change,
                                         installedVersion: version) == .adultAcknowledgment,
              scene.activationState == .foregroundActive, !Task.isCancelled,
              #available(iOS 26.4, *) else { return .unknown }
        busy = true
        defer { busy = false }
        do {
            try await AgeRangeService.shared.showSignificantUpdateAcknowledgment(
                in: scene, updateDescription: change.description)
            return Task.isCancelled || scene.activationState != .foregroundActive
                ? .unknown : .approved
        } catch {
            return .unknown
        }
    }

    #if canImport(PermissionKit)
    // Register the topic before sending; only a response to the exact question
    // is consumed. The caller owns the Task and must cancel it on teardown.
    // No response means still pending (e.g. cancelled send UI or parent delay).
    // No auto-resend or persistent approval; a later lifecycle PR must own both.
    func requestParentalUpdate(_ change: BibloZooSignificantUpdate,
                               assessment: BibloZooAgeAssessment,
                               in presenter: UIViewController,
                               onPending: @escaping () -> Void) async -> BibloZooUpdateState {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        guard !busy, permitted,
              BibloZooUpdateRoute.resolve(assessment, pending: change,
                                         installedVersion: version) == .parentalPermission,
              presenter.viewIfLoaded?.window?.windowScene?.activationState == .foregroundActive,
              presenter.presentedViewController == nil, !Task.isCancelled,
              #available(iOS 26.2, *) else { return .unknown }
        busy = true
        defer { busy = false }
        let question = PermissionQuestion(significantAppUpdateTopic:
            SignificantAppUpdateTopic(description: change.description))
        // PermissionKit chooses the most restrictive default (read-only).
        // Fail closed if the actual question does not default to denial.
        guard question.defaultChoice.answer == .denial else { return .unknown }
        let responses = AskCenter.shared.responses(for: SignificantAppUpdateTopic.self)
        do {
            try await AskCenter.shared.ask(question, in: presenter)
        } catch {
            return .unknown
        }
        guard !Task.isCancelled else { return .unknown }
        onPending()
        for await response in responses {
            guard !Task.isCancelled else { return .unknown }
            let reply: BibloZooUpdateReply
            switch response.choice.answer {
            case .approval: reply = .approved
            case .denial: reply = .denied
            default: reply = .unknown
            }
            if let result = BibloZooUpdateResponseMatch.evaluate(
                expectedID: question.id, responseID: response.question.id,
                reply: reply, cancelled: Task.isCancelled) {
                // A matching response is evidence for this update question
                // only; never a substitute for initial download consent.
                return result
            }
        }
        return .unknown
    }
    #endif
}

// Compiled but disabled in all tracked configurations. This is a test-only
// gate until native consent evidence, update flows, older-OS/offline policy,
// entitlement, lifecycle and sandbox acceptance have been completed.
@MainActor
final class BibloZooAgeStartupCoordinator {
    private var attempt = BibloZooAgeStartupAttempt()
    private var epoch = BibloZooAgeForegroundEpoch()
    private let service = BibloZooAgeAssurance()
    private var task: Task<Void, Never>?
    #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
    private let sandboxUpdateService = BibloZooSignificantUpdateService()
    private var sandboxUpdateStarted = false
    #endif
    #if DEBUG && BIBLOZOO_AGE_ASSURANCE_FIXTURE && targetEnvironment(simulator)
    private var fixtureAttempts = 0
    #endif

    // Real API adapters retain the strict production live-only guard; the
    // separately compiled sandbox permits real API evidence on its own ID.
    static var useNativeGate: Bool {
        #if DEBUG && BIBLOZOO_AGE_ASSURANCE_LIVE
        return Bundle.main.bundleIdentifier == "com.andydoane.biblozoo"
        #else
        return false
        #endif
    }

    static var useFixtureGate: Bool {
        #if DEBUG && BIBLOZOO_AGE_ASSURANCE_FIXTURE && targetEnvironment(simulator)
        return Bundle.main.bundleIdentifier == "com.andydoane.biblozoo.agefixture"
        #else
        return false
        #endif
    }

    static var useSandboxGate: Bool {
        #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
        return Bundle.main.bundleIdentifier == "com.andydoane.biblozoo.agesandbox"
        #else
        return false
        #endif
    }

    static var useStagedGate: Bool { useNativeGate || useFixtureGate || useSandboxGate }

    private func presenterReady(_ scene: UIScene, _ presenter: BibloZooAgeGateViewController) -> Bool {
        scene.activationState == .foregroundActive
            && UIApplication.shared.applicationState == .active
            && presenter.viewIfLoaded?.window?.windowScene === scene
            && presenter.viewIfLoaded?.window?.rootViewController === presenter
            && presenter.presentedViewController == nil
            && !presenter.isBeingDismissed
    }

    func sceneBecameActive(_ scene: UIScene, presenter: BibloZooAgeGateViewController,
                           completion: @escaping (BibloZooAgeAccessDecision) -> Void) {
        // The first scene callback can precede application/window readiness.
        // Reserve a single cancellable preflight; no Apple request or epoch
        // ticket until all existing foreground/presenter checks are true.
        guard Self.useStagedGate, task == nil, !attempt.attempted else { return }
        presenter.showChecking()
        task = Task { @MainActor [weak self, weak presenter, weak scene] in
            guard let self = self else { return }
            var readiness = BibloZooAgeStartupReadiness()
            while !Task.isCancelled {
                guard let presenter = presenter, let scene = scene else {
                    self.attempt.requireExplicitRetry()
                    self.task = nil
                    return
                }
                switch readiness.next(ready: self.presenterReady(scene, presenter)) {
                case .wait:
                    do { try await Task.sleep(nanoseconds: 100_000_000) }
                    catch { return } // background/disconnect owns cancellation cleanup
                    continue
                case .hold:
                    self.attempt.requireExplicitRetry()
                    self.task = nil
                    #if DEBUG && BIBLOZOO_AGE_ASSURANCE_FIXTURE && targetEnvironment(simulator)
                    NSLog("[BibloZooAgeFixture] readiness timeout: sceneActive=\(scene.activationState == .foregroundActive) appActive=\(UIApplication.shared.applicationState == .active) attached=\(presenter.viewIfLoaded?.window?.windowScene === scene) root=\(presenter.viewIfLoaded?.window?.rootViewController === presenter) modal=\(presenter.presentedViewController != nil) dismissing=\(presenter.isBeingDismissed)")
                    #endif
                    completion(.holdUnavailable)
                    return
                case .start:
                    guard self.attempt.begin(bundleID: Bundle.main.bundleIdentifier,
                                             liveEnabled: Self.useNativeGate,
                                             activePresenter: self.presenterReady(scene, presenter),
                                             fixtureEnabled: Self.useFixtureGate,
                                             sandboxEnabled: Self.useSandboxGate),
                          let ticket = self.epoch.begin() else {
                        self.attempt.requireExplicitRetry()
                        self.task = nil
                        completion(.holdUnavailable)
                        return
                    }
                    let decision = await self.evaluate(in: presenter)
                    self.finish(ticket, decision: decision,
                                foreground: self.presenterReady(scene, presenter),
                                cancelled: Task.isCancelled, completion: completion)
                    return
                }
            }
        }
    }

    private func evaluate(in presenter: BibloZooAgeGateViewController) async -> BibloZooAgeAccessDecision {
        #if DEBUG && BIBLOZOO_AGE_ASSURANCE_FIXTURE && targetEnvironment(simulator)
        // No real age API, even if the fixture argument is missing or invalid.
        guard Self.useFixtureGate else { return .holdUnavailable }
        fixtureAttempts += 1
        let attemptNumber = fixtureAttempts
        let fixture = BibloZooAgeFixture.select(arguments: ProcessInfo.processInfo.arguments)
        if fixture == .slowAllow {
            do { try await Task.sleep(nanoseconds: 5_000_000_000) }
            catch { return .holdUnavailable }
        }
        guard !Task.isCancelled else { return .holdUnavailable }
        return fixture.decision(at: attemptNumber)
        #else
        guard Self.useNativeGate || Self.useSandboxGate else { return .holdUnavailable }
        // 1.0 has not previously shipped on the App Store. Do not assume
        // later versions are first release or invent a significant update.
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        let update: BibloZooUpdateState = version == "1.0" ? .firstReleaseNoPending : .unknown
        let assessment = await service.check(in: presenter)
        #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
        if Self.useSandboxGate && ProcessInfo.processInfo.arguments.contains(BibloZooUpdateSandboxPlan.argument) {
            return await evaluateSandboxUpdate(assessment, version: version, in: presenter)
        }
        #endif
        // No native proof of initial minor consent has yet been wired.
        let decision = BibloZooAgeAccessDecision.evaluate(
            assessment, initialConsent: .unknown, update: update)
        #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
        BibloZooAgeSandboxTrace.evaluated(assessment.outcome, decision: decision)
        #endif
        return decision
        #endif
    }

    #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
    // Never allow child content during this experiment. No auto-resend, no
    // durable grants, no simulated consent. Explicit launch argument + actual
    // separate 1.1 sandbox bundle required; never a 1.0 update.
    private func evaluateSandboxUpdate(_ assessment: BibloZooAgeAssessment,
                                       version: String?,
                                       in presenter: BibloZooAgeGateViewController) async -> BibloZooAgeAccessDecision {
        guard BibloZooUpdateSandboxPlan.permits(
            sandbox: Self.useSandboxGate, bundleID: Bundle.main.bundleIdentifier,
            version: version, arguments: ProcessInfo.processInfo.arguments) else {
            BibloZooAgeSandboxTrace.updateEvent(.invalidVersion)
            return .holdUnavailable
        }
        guard !sandboxUpdateStarted else {
            BibloZooAgeSandboxTrace.updateEvent(.repeated)
            return .holdUpdate
        }
        guard !Task.isCancelled else { return .holdUnavailable }
        sandboxUpdateStarted = true
        let change = BibloZooSignificantUpdate(version: "1.1",
            description: "BibloZoo sandbox test only: simulated future significant app update. No actual app change or initial consent request.")
        let route = BibloZooUpdateRoute.resolve(assessment, pending: change, installedVersion: version)
        BibloZooAgeSandboxTrace.updateRoute(route)
        BibloZooAgeSandboxTrace.updateEvent(.started)
        let result: BibloZooUpdateState
        switch route {
        case .adultAcknowledgment:
            if let scene = presenter.viewIfLoaded?.window?.windowScene {
                result = await sandboxUpdateService.acknowledgeAdult(change, assessment: assessment, in: scene)
            } else { result = .unknown }
        case .parentalPermission:
            #if canImport(PermissionKit)
            result = await sandboxUpdateService.requestParentalUpdate(change, assessment: assessment, in: presenter) {
                guard !Task.isCancelled else { return }
                BibloZooAgeSandboxTrace.updateEvent(.pending)
                presenter.showSandboxUpdatePending()
            }
            #else
            result = .unknown
            #endif
        case .noPrompt:
            result = .verifiedNoPending
        case .needsAge, .unavailable:
            result = .unknown
        }
        BibloZooAgeSandboxTrace.updateResult(result)
        BibloZooAgeSandboxTrace.updateEvent(.finished)
        let decision = BibloZooUpdateSandboxPlan.barrier(assessment, result: result)
        BibloZooAgeSandboxTrace.evaluated(assessment.outcome, decision: decision)
        return decision
    }
    #endif

    private func finish(_ ticket: UUID, decision: BibloZooAgeAccessDecision,
                        foreground: Bool, cancelled: Bool,
                        completion: (BibloZooAgeAccessDecision) -> Void) {
        guard let result = epoch.finish(ticket, decision: decision,
                                        foreground: foreground, cancelled: cancelled) else {
            #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
            BibloZooAgeSandboxTrace.discarded()
            #endif
            return
        }
        task = nil
        #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
        BibloZooAgeSandboxTrace.finished(result)
        #endif
        completion(result)
    }

    func retry(_ scene: UIScene, presenter: BibloZooAgeGateViewController,
               completion: @escaping (BibloZooAgeAccessDecision) -> Void) {
        guard task == nil else { return }
        // Only an explicit native button tap can authorize another attempt.
        attempt = BibloZooAgeStartupAttempt()
        sceneBecameActive(scene, presenter: presenter, completion: completion)
    }

    @discardableResult
    func sceneLeftForeground() -> Bool {
        // True background invalidates the ticket before cancellation; a late
        // completion cannot change the new foreground or clear its task.
        let recheck = epoch.invalidate()
        task?.cancel()
        task = nil
        if recheck { attempt = BibloZooAgeStartupAttempt() }
        else { attempt.requireExplicitRetry() }
        return recheck
    }
}

// Native placeholder exists before WKWebView creation, so no child-facing
// content or JS bridge is loaded while this staged gate is unresolved.
@MainActor
final class BibloZooAgeGateViewController: UIViewController {
    var onRetry: (() -> Void)?
    var onAppearance: (() -> Void)?
    private let heading = UILabel()
    private let message = UILabel()
    private let spinner = UIActivityIndicatorView(style: .large)
    private let retryButton = UIButton(type: .system)

    // Native counterpart of verse_games/shared/kids-setup.css. Reuse the
    // packaged local artwork, not the setup WebView, its JS or permission code.
    private static let purple = UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 73/255, green: 53/255, blue: 117/255, alpha: 1)
            : UIColor(red: 127/255, green: 102/255, blue: 198/255, alpha: 1)
    }
    private static let buttonInk = UIColor(red: 76/255, green: 43/255, blue: 125/255, alpha: 1)

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    // Register the same local variable font used by kids-setup.css, once
    // per process. No Info.plist change, second font copy or WebView needed.
    private static let balooAvailable: Bool = {
        if UIFont(name: "Baloo2-Regular", size: 19) != nil { return true }
        guard let directory = Bundle.main.resourceURL else { return false }
        let url = directory.appendingPathComponent("public/verse_fonts/Baloo2.ttf")
        _ = CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        return UIFont(name: "Baloo2-Regular", size: 19) != nil
    }()

    private func brandedFont(_ size: CGFloat, weight: UIFont.Weight,
                             style: UIFont.TextStyle) -> UIFont {
        let base: UIFont
        if Self.balooAvailable, let regular = UIFont(name: "Baloo2-Regular", size: size) {
            // The bundled font has a wght axis (400...800). Use its real
            // bold/semibold outlines, clamping CSS weight 900 to its maximum.
            let value = weight == .heavy ? 800 : weight == .bold ? 800 : 650
            let axis = NSNumber(value: UInt32(0x77676874)) // 'wght'
            let key = UIFontDescriptor.Attribute(rawValue: kCTFontVariationAttribute as String)
            let descriptor = regular.fontDescriptor.addingAttributes([
                key: [axis: NSNumber(value: value)]
            ])
            base = UIFont(descriptor: descriptor, size: size)
        } else {
            // A missing/unreadable font cannot interfere with permission UI.
            let system = UIFont.systemFont(ofSize: size, weight: weight)
            base = system.fontDescriptor.withDesign(.rounded)
                .map { UIFont(descriptor: $0, size: size) } ?? system
        }
        return UIFontMetrics(forTextStyle: style).scaledFont(for: base)
    }

    private func styleLabel(_ label: UILabel, size: CGFloat, weight: UIFont.Weight,
                            style: UIFont.TextStyle) {
        label.font = brandedFont(size, weight: weight, style: style)
        label.adjustsFontForContentSizeCategory = true
        label.textColor = .white
        label.textAlignment = .center
        label.numberOfLines = 0
    }

    private func brandImage(_ name: String, height: CGFloat,
                            label: String? = nil) -> UIView? {
        guard let directory = Bundle.main.resourceURL,
              let image = UIImage(contentsOfFile: directory
                .appendingPathComponent("public/verse_images")
                .appendingPathComponent(name).path) else { return nil }
        let imageView = UIImageView(image: image)
        imageView.contentMode = .scaleAspectFit
        // The arranged view has no image intrinsic size. Its required
        // geometry is set by the stable column, not by other stack content.
        let holder = UIView()
        holder.isAccessibilityElement = false
        imageView.isAccessibilityElement = label != nil
        imageView.accessibilityLabel = label
        imageView.accessibilityTraits = .image
        imageView.translatesAutoresizingMaskIntoConstraints = false
        holder.addSubview(imageView)
        NSLayoutConstraint.activate([
            holder.heightAnchor.constraint(equalToConstant: height),
            imageView.leadingAnchor.constraint(equalTo: holder.leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: holder.trailingAnchor),
            imageView.topAnchor.constraint(equalTo: holder.topAnchor),
            imageView.bottomAnchor.constraint(equalTo: holder.bottomAnchor)
        ])
        return holder
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = Self.purple
        let scroll = UIScrollView()
        scroll.translatesAutoresizingMaskIntoConstraints = false
        scroll.alwaysBounceVertical = false
        scroll.showsHorizontalScrollIndicator = false
        scroll.contentInsetAdjustmentBehavior = .never
        scroll.indicatorStyle = .white
        view.addSubview(scroll)

        let content = UIView()
        content.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(content)
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 16
        stack.alignment = .fill
        stack.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(stack)

        if let animals = brandImage("title_biblozoo_animals.png", height: 110) {
            stack.addArrangedSubview(animals)
            stack.setCustomSpacing(4, after: animals)
        }
        if let logo = brandImage("title_biblozoo.png", height: 82, label: "BibloZoo") {
            stack.addArrangedSubview(logo)
        } else {
            // A missing decorative resource must never prevent a hold or retry.
            let brand = UILabel()
            styleLabel(brand, size: 32, weight: .heavy, style: .title1)
            brand.text = "BibloZoo"
            stack.addArrangedSubview(brand)
        }

        #if DEBUG && BIBLOZOO_AGE_ASSURANCE_FIXTURE && targetEnvironment(simulator)
        if BibloZooAgeStartupCoordinator.useFixtureGate {
            let banner = UILabel()
            styleLabel(banner, size: 15, weight: .bold, style: .footnote)
            banner.text = "SIMULATOR TEST — FAKE CONSENT"
            stack.addArrangedSubview(banner)
        }
        #endif
        #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
        if BibloZooAgeStartupCoordinator.useSandboxGate {
            let banner = UILabel()
            styleLabel(banner, size: 15, weight: .bold, style: .footnote)
            banner.text = "DEVICE TEST — AGE ASSURANCE SANDBOX"
            stack.addArrangedSubview(banner)
            if ProcessInfo.processInfo.arguments.contains(BibloZooUpdateSandboxPlan.argument) {
                let note = UILabel()
                styleLabel(note, size: 15, weight: .semibold, style: .footnote)
                note.text = "Update test only — the Zoo stays closed even after approval."
                stack.addArrangedSubview(note)
            }
        }
        #endif

        styleLabel(heading, size: 30, weight: .heavy, style: .title1)
        heading.accessibilityTraits.insert(.header)
        stack.addArrangedSubview(heading)
        styleLabel(message, size: 19, weight: .semibold, style: .body)
        stack.addArrangedSubview(message)

        spinner.color = .white
        spinner.hidesWhenStopped = true
        spinner.isAccessibilityElement = false
        stack.addArrangedSubview(spinner)

        retryButton.setTitle("Try Again", for: .normal)
        retryButton.setTitleColor(Self.buttonInk, for: .normal)
        retryButton.backgroundColor = .white
        retryButton.titleLabel?.font = brandedFont(21, weight: .heavy, style: .headline)
        retryButton.titleLabel?.adjustsFontForContentSizeCategory = true
        retryButton.titleLabel?.numberOfLines = 0
        retryButton.titleLabel?.textAlignment = .center
        retryButton.titleLabel?.lineBreakMode = .byWordWrapping
        retryButton.contentEdgeInsets = UIEdgeInsets(top: 14, left: 18, bottom: 14, right: 18)
        retryButton.layer.cornerRadius = 27
        retryButton.layer.shadowColor = UIColor.black.cgColor
        retryButton.layer.shadowOpacity = 0.23
        retryButton.layer.shadowOffset = CGSize(width: 0, height: 6)
        retryButton.layer.shadowRadius = 0
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        stack.addArrangedSubview(retryButton)

        // Anchor artwork to the viewport, not the changing stack midpoint.
        // A fixed top spacer depends only on available height. At short
        // heights it collapses to 24pt; larger text can extend the scroll area.
        let topSpace = UILayoutGuide()
        content.addLayoutGuide(topSpace)
        let preferredTop = topSpace.heightAnchor.constraint(
            equalTo: scroll.frameLayoutGuide.heightAnchor, multiplier: 0.5, constant: -210)
        preferredTop.priority = UILayoutPriority(999)
        let preferredHeight = content.heightAnchor.constraint(equalTo: scroll.frameLayoutGuide.heightAnchor)
        preferredHeight.priority = UILayoutPriority(249)
        // Prefer full safe width minus margins, unless the required iPad
        // maximum wins. This beats text/image intrinsic sizing priorities.
        let preferredWidth = stack.widthAnchor.constraint(equalTo: content.widthAnchor, constant: -48)
        preferredWidth.priority = UILayoutPriority(999)
        NSLayoutConstraint.activate([
            scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scroll.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            scroll.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            content.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor),
            content.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor),
            content.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor),
            content.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor),
            content.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor),
            content.heightAnchor.constraint(greaterThanOrEqualTo: scroll.frameLayoutGuide.heightAnchor),
            preferredHeight,
            topSpace.topAnchor.constraint(equalTo: content.topAnchor),
            topSpace.leadingAnchor.constraint(equalTo: content.leadingAnchor),
            topSpace.trailingAnchor.constraint(equalTo: content.trailingAnchor),
            topSpace.heightAnchor.constraint(greaterThanOrEqualToConstant: 24),
            preferredTop,
            stack.centerXAnchor.constraint(equalTo: content.centerXAnchor),
            stack.topAnchor.constraint(equalTo: topSpace.bottomAnchor),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: content.bottomAnchor, constant: -30),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: content.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: content.trailingAnchor, constant: -24),
            stack.widthAnchor.constraint(lessThanOrEqualToConstant: 420),
            preferredWidth,
            retryButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 54)
        ])
        showChecking()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        retryButton.layer.cornerRadius = retryButton.bounds.height / 2
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        onAppearance?()
    }

    private func render(title: String, detail: String, busy: Bool, retry: Bool) {
        loadViewIfNeeded()
        let changed = heading.text != title || message.text != detail
        heading.text = title
        message.text = detail
        retryButton.isHidden = !retry
        if busy { spinner.startAnimating() } else { spinner.stopAnimating() }
        if changed, view.window != nil, UIAccessibility.isVoiceOverRunning {
            UIAccessibility.post(notification: .screenChanged, argument: heading)
        }
    }

    func showChecking() {
        render(title: "Getting BibloZoo Ready!",
               detail: "Checking App Store requirements. This may take a moment.",
               busy: true, retry: false)
    }

    #if DEBUG && BIBLOZOO_AGE_ASSURANCE_SANDBOX && !targetEnvironment(simulator)
    func showSandboxUpdatePending() {
        guard BibloZooAgeStartupCoordinator.useSandboxGate else { return }
        render(title: "Waiting for Permission",
               detail: "Waiting for the sandbox update response from Apple.",
               busy: true, retry: false)
    }
    #endif

    func showHold(_ decision: BibloZooAgeAccessDecision) {
        // Only the presentation changes. No raw age, identifiers, detailed
        // errors, skip action or local permission grant. Preserve retry policy.
        let title: String
        let detail: String
        switch decision {
        case .holdAgeVerification:
            title = "A Grown-up Can Help!"
            detail = "Please ask a grown-up to check the age-sharing settings for this Apple Account."
        case .holdInitialConsent:
            title = "A Grown-up Can Help!"
            detail = "We couldn't confirm App Store permission for BibloZoo. Please ask a grown-up for help."
        case .holdUpdate:
            title = "App Update Permission"
            detail = "Permission for this app update is needed. Please ask a grown-up for help."
        case .holdDenied:
            title = "Permission Isn't Available"
            detail = "App Store permission is not available. Please ask a grown-up for help."
        case .holdUnsupportedPlatform:
            title = "This Device Needs Help"
            detail = "This device cannot complete the required App Store check. Please ask a grown-up for help."
        case .holdUnavailable, .allowChildSafe:
            title = "Let's Try Again"
            detail = "The App Store check could not finish. Ask a grown-up to check the connection, or try again."
        }
        render(title: title, detail: detail, busy: false,
               retry: decision != .holdUnsupportedPlatform)
    }

    @objc private func retryTapped() { onRetry?() }
}
#endif
