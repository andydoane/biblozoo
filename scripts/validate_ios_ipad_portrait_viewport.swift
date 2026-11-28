import Foundation

@main
struct BibloZooPortraitViewportTests {
    static func main() {
        func check(_ width: CGFloat, _ height: CGFloat, _ expectedWidth: CGFloat) {
            let bounds = CGRect(x: 0, y: 0, width: width, height: height)
            let frame = BibloZooPortraitViewportGeometry.frame(in: bounds)
            precondition(abs(frame.width - expectedWidth) < 0.001, "Unexpected width for \(bounds): \(frame)")
            precondition(abs(frame.midX - bounds.midX) < 0.001)
            precondition(frame.minY == bounds.minY && frame.height == bounds.height)
            precondition(frame.minX >= bounds.minX && frame.maxX <= bounds.maxX)
        }
        check(834, 1194, 834) // ordinary 11-inch portrait
        check(1024, 1366, 1024) // 4:3-class portrait
        check(1194, 834, 625.5) // wide landscape
        check(1366, 1024, 768)
        check(600, 800, 600) // exact ratio boundary
        check(601, 800, 600) // continuous transition
        check(600, 600, 450) // square resizable window
        check(1000, 700, 525)
        check(320, 700, 320) // narrow multitasking window
        check(0, 0, 0)
        let offset = CGRect(x: 10, y: 20, width: 1000, height: 700)
        precondition(BibloZooPortraitViewportGeometry.frame(in: offset) == CGRect(x: 247.5, y: 20, width: 525, height: 700))
        print("iPad portrait viewport geometry PASS (portable Swift; not UIKit runtime acceptance)")
    }
}
