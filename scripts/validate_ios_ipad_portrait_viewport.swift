import Foundation

@main
struct BibloZooPortraitViewportTests {
    static func main() {
        func check(_ screen: CGSize, _ window: CGSize, _ expectedScale: CGFloat,
                   origin: CGPoint = .zero) {
            let bounds = CGRect(origin: origin, size: window)
            guard let layout = BibloZooPortraitViewportGeometry.layout(in: bounds, screenSize: screen) else {
                fatalError("Expected layout")
            }
            let logical = CGSize(width: min(screen.width, screen.height),
                                 height: max(screen.width, screen.height))
            precondition(layout.logicalSize == logical, "Logical viewport changed")
            precondition(abs(layout.scale - expectedScale) < 0.000001, "Wrong scale")
            precondition(layout.center == CGPoint(x: bounds.midX, y: bounds.midY))
            let visible = CGSize(width: logical.width * layout.scale, height: logical.height * layout.scale)
            precondition(visible.width <= bounds.width + 0.000001)
            precondition(visible.height <= bounds.height + 0.000001)
            precondition(abs(visible.width / visible.height - logical.width / logical.height) < 0.000001)
        }
        for portrait in [CGSize(width: 768, height: 1024), CGSize(width: 834, height: 1194),
                         CGSize(width: 1024, height: 1366), CGSize(width: 744, height: 1133)] {
            let landscape = CGSize(width: portrait.height, height: portrait.width)
            check(portrait, portrait, 1)
            check(portrait, landscape, portrait.width / portrait.height)
            check(landscape, landscape, portrait.width / portrait.height)
            check(landscape, portrait, 1)
            check(portrait, portrait, 1) // round trip
        }
        let screen = CGSize(width: 768, height: 1024)
        check(screen, CGSize(width: 320, height: 700), 320.0 / 768.0)
        check(screen, CGSize(width: 600, height: 600), 600.0 / 1024.0)
        check(screen, CGSize(width: 1000, height: 700), 700.0 / 1024.0,
              origin: CGPoint(x: 10, y: 20))
        check(screen, CGSize(width: 1200, height: 1600), 1) // never enlarge above native portrait
        precondition(BibloZooPortraitViewportGeometry.layout(in: .zero, screenSize: screen) == nil)
        precondition(BibloZooPortraitViewportGeometry.layout(in: CGRect(origin: .zero, size: screen), screenSize: .zero) == nil)
        print("iPad uniform portrait scale PASS (portable Swift; UIKit runtime not tested)")
    }
}
