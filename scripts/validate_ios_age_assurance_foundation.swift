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
    }
}
