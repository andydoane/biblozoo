// Synthetic values only; compile with BibloZooAgeAssurance.swift on macOS.
import Foundation

@main
struct BibloZooAgeAssuranceTests {
    static func main() {
        typealias O = BibloZooAgeRangeOutcome
        let cases: [(Int?, Int?, Bool, O)] = [
            (nil, 12, false, .minor),
            (13, 15, true, .minor),
            (16, 17, false, .minor),
            (18, nil, true, .confirmedAdult),
            (18, 20, false, .adultNotConfirmed),
            (21, nil, false, .adultNotConfirmed),
            (nil, nil, true, .ambiguous),
            (nil, 18, true, .ambiguous),
            (16, 18, true, .ambiguous),
            (18, 17, true, .ambiguous),
            (-1, 12, false, .ambiguous),
            (nil, -1, false, .ambiguous),
            (0, 0, false, .minor),
            (18, 18, true, .confirmedAdult)
        ]
        for (index, test) in cases.enumerated() {
            let result = O.classify(lower: test.0, upper: test.1, confirmed: test.2)
            precondition(result == test.3, "Synthetic case \(index) failed")
        }
        print("PASS: \(cases.count) synthetic age-range classification cases")

        let regulatory: [(Bool, Bool, Bool, O)] = [
            (false, false, false, .notRequired),
            (true, false, false, .needsCheck),
            (false, true, false, .updateRequirementsOnly),
            (true, true, false, .needsCheck),
            (false, false, true, .unavailable),
            (false, true, true, .unavailable),
            (true, true, true, .needsCheck)
        ]
        for (index, item) in regulatory.enumerated() {
            precondition(O.regulatoryOutcome(ageRequired: item.0,
                                             updateRequired: item.1,
                                             unknownRequirement: item.2) == item.3,
                         "Regulatory case \(index) failed")
        }
        print("PASS: \(regulatory.count) synthetic regulatory routing cases")

        var startup = BibloZooAgeStartupAttempt()
        let prod = "com.andydoane.biblozoo"
        precondition(!startup.begin(bundleID: prod, liveEnabled: false, activePresenter: true))
        precondition(!startup.begin(bundleID: "com.andydoane.biblozoo.audiotest",
                                    liveEnabled: true, activePresenter: true))
        precondition(!startup.begin(bundleID: nil, liveEnabled: true, activePresenter: true))
        precondition(!startup.begin(bundleID: "other", liveEnabled: true, activePresenter: true))
        precondition(!startup.begin(bundleID: prod, liveEnabled: true, activePresenter: false))
        precondition(!startup.attempted)
        precondition(startup.begin(bundleID: prod, liveEnabled: true, activePresenter: true))
        precondition(startup.attempted)
        precondition(!startup.begin(bundleID: prod, liveEnabled: true, activePresenter: true))
        var newScene = BibloZooAgeStartupAttempt()
        precondition(newScene.begin(bundleID: prod, liveEnabled: true, activePresenter: true))
        print("PASS: 10 synthetic startup lifecycle assertions")

        // Delayed foreground/window readiness must not consume an age attempt.
        var readiness = BibloZooAgeStartupReadiness(maxWaits: 2)
        precondition(readiness.next(ready: false) == .wait)
        precondition(readiness.remainingWaits == 1)
        precondition(readiness.next(ready: true) == .start)
        var timeout = BibloZooAgeStartupReadiness(maxWaits: 2)
        precondition(timeout.next(ready: false) == .wait)
        precondition(timeout.next(ready: false) == .wait)
        precondition(timeout.next(ready: false) == .hold)
        precondition(timeout.remainingWaits == 0)
        var readyAtDeadline = BibloZooAgeStartupReadiness(maxWaits: 0)
        precondition(readyAtDeadline.next(ready: true) == .start)
        var interrupted = BibloZooAgeStartupAttempt()
        interrupted.requireExplicitRetry()
        precondition(interrupted.attempted)
        precondition(!interrupted.begin(bundleID: prod, liveEnabled: true, activePresenter: true))
        interrupted = BibloZooAgeStartupAttempt()
        precondition(interrupted.begin(bundleID: prod, liveEnabled: true, activePresenter: true))
        print("PASS: 11 synthetic startup readiness assertions")

        let regulated: [(Int?, Int?, Bool, O)] = [
            (nil, 12, false, .minor), (13, 15, false, .minor),
            (16, 17, false, .minor), (18, nil, true, .confirmedAdult),
            (nil, 17, true, .ambiguous), (12, 15, true, .ambiguous),
            (13, 17, true, .ambiguous), (16, 18, true, .ambiguous),
            (18, nil, false, .adultNotConfirmed)
        ]
        for (index, test) in regulated.enumerated() {
            precondition(O.classifyRegulated(lower: test.0, upper: test.1,
                                             confirmed: test.2) == test.3,
                         "Regulated category case \(index) failed")
        }
        print("PASS: \(regulated.count) synthetic regulated age-category cases")

        typealias A = BibloZooAgeAssessment
        typealias D = BibloZooAgeAccessDecision
        typealias C = BibloZooInitialConsent
        typealias U = BibloZooUpdateState
        let policy: [(A, C, U, D)] = [
            (A(.notRequired), .unknown, .firstReleaseNoPending, .allowChildSafe),
            (A(.updateRequirementsOnly, adultUpdateNotice: true), .unknown, .firstReleaseNoPending, .allowChildSafe),
            (A(.confirmedAdult), .unknown, .firstReleaseNoPending, .allowChildSafe),
            (A(.adultNotConfirmed), .unknown, .firstReleaseNoPending, .holdAgeVerification),
            (A(.minor), .unknown, .firstReleaseNoPending, .holdInitialConsent),
            (A(.minor), .verified, .firstReleaseNoPending, .allowChildSafe),
            (A(.minor), .deniedOrRevoked, .firstReleaseNoPending, .holdDenied),
            (A(.declined), .unknown, .firstReleaseNoPending, .holdAgeVerification),
            (A(.ambiguous), .unknown, .firstReleaseNoPending, .holdAgeVerification),
            (A(.unavailable), .unknown, .firstReleaseNoPending, .holdUnavailable),
            (A(.needsCheck), .unknown, .firstReleaseNoPending, .holdUnavailable),
            (A(.confirmedAdult, unknownRequirement: true), .unknown, .firstReleaseNoPending, .holdUnavailable),
            (A(.notRequired, unknownRequirement: true), .unknown, .firstReleaseNoPending, .holdUnavailable),
            (A(.confirmedAdult, adultUpdateNotice: true), .unknown, .pending, .holdUpdate),
            (A(.minor, minorUpdateConsent: true), .verified, .pending, .holdUpdate),
            (A(.minor, minorUpdateConsent: true), .verified, .approved, .allowChildSafe),
            (A(.minor, minorUpdateConsent: true), .unknown, .approved, .holdInitialConsent),
            (A(.confirmedAdult), .unknown, .denied, .holdDenied),
            (A(.notRequired), .unknown, .unknown, .holdUnavailable),
            (A(.confirmedAdult), .unknown, .verifiedNoPending, .allowChildSafe),
            (A(.updateRequirementsOnly, minorUpdateConsent: true), .unknown, .pending, .holdUpdate),
            (A(.confirmedAdult), .deniedOrRevoked, .approved, .holdDenied)
        ]
        for (index, test) in policy.enumerated() {
            precondition(D.evaluate(test.0, initialConsent: test.1, update: test.2) == test.3,
                         "Access policy case \(index) failed")
        }
        let mixed = A(.needsCheck, adultUpdateNotice: true,
                      minorUpdateConsent: true, unknownRequirement: true)
        let response = mixed.withOutcome(.confirmedAdult)
        precondition(response.adultUpdateNotice && response.minorUpdateConsent && response.unknownRequirement)
        precondition(D.evaluate(response, initialConsent: .unknown,
                                update: .firstReleaseNoPending) == .holdUnavailable)
        print("PASS: \(policy.count + 2) synthetic access policy assertions")

        let change = BibloZooSignificantUpdate(version: "1.1", description: "Synthetic update description")
        let first = BibloZooSignificantUpdate(version: "1.0", description: "Synthetic")
        let blank = BibloZooSignificantUpdate(version: "1.1", description: " ")
        typealias R = BibloZooUpdateRoute
        let routes: [(A, BibloZooSignificantUpdate?, String?, R)] = [
            (A(.confirmedAdult, adultUpdateNotice: true), nil, "1.0", .noPrompt),
            (A(.minor, minorUpdateConsent: true), nil, "1.0", .noPrompt),
            (A(.confirmedAdult, adultUpdateNotice: true), first, "1.0", .unavailable),
            (A(.confirmedAdult, adultUpdateNotice: true), change, "1.2", .unavailable),
            (A(.confirmedAdult, adultUpdateNotice: true), change, nil, .unavailable),
            (A(.confirmedAdult, adultUpdateNotice: true), blank, "1.1", .unavailable),
            (A(.confirmedAdult, adultUpdateNotice: true), change, "1.1", .adultAcknowledgment),
            (A(.minor, minorUpdateConsent: true), change, "1.1", .parentalPermission),
            (A(.minor, adultUpdateNotice: true), change, "1.1", .noPrompt),
            (A(.confirmedAdult, minorUpdateConsent: true), change, "1.1", .noPrompt),
            (A(.notRequired), change, "1.1", .noPrompt),
            (A(.updateRequirementsOnly, adultUpdateNotice: true), change, "1.1", .needsAge),
            (A(.needsCheck), change, "1.1", .needsAge),
            (A(.declined), change, "1.1", .unavailable),
            (A(.adultNotConfirmed), change, "1.1", .unavailable),
            (A(.ambiguous), change, "1.1", .unavailable),
            (A(.unavailable), change, "1.1", .unavailable),
            (A(.confirmedAdult, adultUpdateNotice: true, unknownRequirement: true), change, "1.1", .unavailable)
        ]
        for (index, test) in routes.enumerated() {
            precondition(R.resolve(test.0, pending: test.1,
                                   installedVersion: test.2) == test.3,
                         "Update route case \(index) failed")
        }
        print("PASS: \(routes.count) synthetic significant-update routing cases")

        let currentID = UUID()
        let otherID = UUID()
        typealias M = BibloZooUpdateResponseMatch
        precondition(M.evaluate(expectedID: currentID, responseID: currentID,
                                reply: .approved, cancelled: false) == .approved)
        precondition(M.evaluate(expectedID: currentID, responseID: currentID,
                                reply: .denied, cancelled: false) == .denied)
        precondition(M.evaluate(expectedID: currentID, responseID: currentID,
                                reply: .unknown, cancelled: false) == .unknown)
        precondition(M.evaluate(expectedID: currentID, responseID: otherID,
                                reply: .approved, cancelled: false) == nil)
        precondition(M.evaluate(expectedID: currentID, responseID: currentID,
                                reply: .approved, cancelled: true) == nil)
        precondition(M.evaluate(expectedID: currentID, responseID: otherID,
                                reply: .denied, cancelled: false) == nil)
        precondition(D.evaluate(A(.minor, minorUpdateConsent: true),
                                initialConsent: .unknown, update: .approved) == .holdInitialConsent)
        print("PASS: 7 synthetic significant-update response assertions")

        // Only freshly completed foreground checks can authorize the scene.
        var epoch = BibloZooAgeForegroundEpoch()
        let firstTicket = epoch.begin()!
        precondition(epoch.begin() == nil)
        precondition(!epoch.authorized)
        precondition(epoch.finish(firstTicket, decision: .allowChildSafe,
                                  foreground: true, cancelled: false) == .allowChildSafe)
        precondition(epoch.authorized)
        precondition(epoch.begin() == nil)
        precondition(epoch.invalidate())
        precondition(!epoch.authorized)
        let secondTicket = epoch.begin()!
        precondition(firstTicket != secondTicket)
        precondition(epoch.finish(firstTicket, decision: .allowChildSafe,
                                  foreground: true, cancelled: false) == nil)
        precondition(epoch.current == secondTicket)
        precondition(epoch.finish(secondTicket, decision: .holdDenied,
                                  foreground: true, cancelled: false) == .holdDenied)
        precondition(!epoch.authorized)
        precondition(!epoch.invalidate())
        let thirdTicket = epoch.begin()!
        precondition(!epoch.invalidate())
        precondition(epoch.finish(thirdTicket, decision: .allowChildSafe,
                                  foreground: true, cancelled: false) == nil)
        let fourthTicket = epoch.begin()!
        precondition(epoch.finish(fourthTicket, decision: .allowChildSafe,
                                  foreground: false, cancelled: false) == .holdUnavailable)
        precondition(!epoch.authorized)
        let fifthTicket = epoch.begin()!
        precondition(epoch.finish(fifthTicket, decision: .allowChildSafe,
                                  foreground: true, cancelled: true) == .holdUnavailable)
        precondition(!epoch.authorized)
        let retryTicket = epoch.begin()!
        precondition(epoch.finish(retryTicket, decision: .allowChildSafe,
                                  foreground: true, cancelled: false) == .allowChildSafe)
        precondition(epoch.authorized)
        print("PASS: 21 synthetic foreground authorization assertions")

        // No connectivity probe, account-cohort guess or persisted approval.
        // A fresh successful system result is usable regardless of whether
        // the OS obtained it online or locally; an error is never permission.
        let availability: [(A, C, U, D)] = [
            (A(.unsupportedPlatform), .unknown, .firstReleaseNoPending, .holdUnsupportedPlatform),
            (A(.unsupportedPlatform), .verified, .firstReleaseNoPending, .holdUnsupportedPlatform),
            (A(.unsupportedPlatform), .deniedOrRevoked, .firstReleaseNoPending, .holdDenied),
            (A(.unsupportedPlatform), .unknown, .denied, .holdDenied),
            (A(.unavailable), .verified, .approved, .holdUnavailable),
            (A(.unavailable), .unknown, .firstReleaseNoPending, .holdUnavailable),
            (A(.notRequired), .unknown, .firstReleaseNoPending, .allowChildSafe),
            (A(.minor), .unknown, .firstReleaseNoPending, .holdInitialConsent),
            (A(.minor), .unknown, .approved, .holdInitialConsent),
            (A(.minor), .verified, .firstReleaseNoPending, .allowChildSafe),
            (A(.confirmedAdult), .unknown, .firstReleaseNoPending, .allowChildSafe),
            (A(.notRequired, unknownRequirement: true), .unknown, .firstReleaseNoPending, .holdUnavailable)
        ]
        for (index, test) in availability.enumerated() {
            precondition(D.evaluate(test.0, initialConsent: test.1, update: test.2) == test.3,
                         "Availability policy case \(index) failed")
        }
        precondition(R.resolve(A(.unsupportedPlatform), pending: change,
                               installedVersion: "1.1") == .unavailable)
        // Even a previously granted session cannot reenter using a stale
        // decision when the next system check is unavailable.
        var offlineEpoch = BibloZooAgeForegroundEpoch()
        let onlineTicket = offlineEpoch.begin()!
        precondition(offlineEpoch.finish(onlineTicket, decision: .allowChildSafe,
                                         foreground: true, cancelled: false) == .allowChildSafe)
        precondition(offlineEpoch.invalidate())
        let offlineTicket = offlineEpoch.begin()!
        precondition(offlineEpoch.finish(onlineTicket, decision: .allowChildSafe,
                                         foreground: true, cancelled: false) == nil)
        precondition(offlineEpoch.finish(offlineTicket, decision: .holdUnavailable,
                                         foreground: true, cancelled: false) == .holdUnavailable)
        precondition(!offlineEpoch.authorized)
        print("PASS: \(availability.count + 6) synthetic availability and offline-policy assertions")

        #if DEBUG
        typealias F = BibloZooAgeFixture
        let fixtureID = "com.andydoane.biblozoo.agefixture"
        let fixtureCases: [(F, Int, D)] = [
            (.allow, 1, .allowChildSafe), (.adult, 1, .allowChildSafe),
            (.minorApproved, 1, .allowChildSafe), (.minorUnknown, 1, .holdInitialConsent),
            (.declined, 1, .holdAgeVerification), (.denied, 1, .holdDenied),
            (.unavailable, 1, .holdUnavailable), (.unsupported, 1, .holdUnsupportedPlatform),
            (.updatePending, 1, .holdUpdate), (.retryAllow, 1, .holdUnavailable),
            (.retryAllow, 2, .allowChildSafe), (.reentryDenied, 1, .allowChildSafe),
            (.reentryDenied, 2, .holdDenied), (.slowAllow, 1, .allowChildSafe)
        ]
        for (fixture, attempt, expected) in fixtureCases {
            precondition(fixture.decision(at: attempt) == expected)
        }
        precondition(F.select(arguments: []) == .unavailable)
        precondition(F.select(arguments: ["--biblozoo-age-fixture=unknown"]) == .unavailable)
        precondition(F.select(arguments: ["--biblozoo-age-fixture=allow", "--biblozoo-age-fixture=adult"]) == .unavailable)
        precondition(F.select(arguments: ["--biblozoo-age-fixture=minor-approved"]) == .minorApproved)
        var fixtureStartup = BibloZooAgeStartupAttempt()
        precondition(!fixtureStartup.begin(bundleID: prod, liveEnabled: false, activePresenter: true, fixtureEnabled: true))
        precondition(!fixtureStartup.begin(bundleID: fixtureID, liveEnabled: true, activePresenter: true, fixtureEnabled: true))
        precondition(!fixtureStartup.begin(bundleID: fixtureID, liveEnabled: true, activePresenter: true))
        precondition(!fixtureStartup.begin(bundleID: fixtureID, liveEnabled: false, activePresenter: false, fixtureEnabled: true))
        precondition(!fixtureStartup.begin(bundleID: fixtureID, liveEnabled: false, activePresenter: true))
        precondition(fixtureStartup.begin(bundleID: fixtureID, liveEnabled: false, activePresenter: true, fixtureEnabled: true))
        precondition(!fixtureStartup.begin(bundleID: fixtureID, liveEnabled: false, activePresenter: true, fixtureEnabled: true))
        print("PASS: \(fixtureCases.count + 11) synthetic simulator fixture assertions")
        #endif
    }
}
