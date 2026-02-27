import SwiftUI

struct MoonPhaseIcon: View {
    let phase: Double
    var size: CGFloat = 64
    var tiltAngle: Double = 0

    var body: some View {
        Canvas { context, _ in
            let r = size / 2 - 1
            let cx = size / 2
            let cy = size / 2

            let normalizedPhase = ((phase.truncatingRemainder(dividingBy: 1)) + 1)
                .truncatingRemainder(dividingBy: 1)

            // Apply rotation for tilt
            context.translateBy(x: cx, y: cy)
            context.rotate(by: .degrees(tiltAngle))
            context.translateBy(x: -cx, y: -cy)

            // Dark side circle (subtle)
            let darkPath = Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
            context.fill(darkPath, with: .color(Color(white: 0.08, opacity: 0.5)))

            // Lit side
            if normalizedPhase >= 0.01 && normalizedPhase <= 0.99 {
                let litPath = buildLitPath(cx: cx, cy: cy, r: r, normalizedPhase: normalizedPhase)

                // Gradient for lit side - matches the web app's radial gradient
                let gradient = Gradient(colors: [
                    Color(red: 0.867, green: 0.847, blue: 0.808), // #ddd8ce
                    Color(red: 0.722, green: 0.702, blue: 0.651), // #b8b3a6
                    Color(red: 0.604, green: 0.584, blue: 0.537), // #9a9589
                ])
                context.fill(
                    litPath,
                    with: .radialGradient(
                        gradient,
                        center: CGPoint(x: cx * 0.76, y: cy * 0.64),
                        startRadius: 0,
                        endRadius: r * 1.3
                    )
                )
            }

            // Reset transform for rim
            context.translateBy(x: cx, y: cy)
            context.rotate(by: .degrees(-tiltAngle))
            context.translateBy(x: -cx, y: -cy)

            // Rim light
            let rimPath = Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
            context.stroke(rimPath, with: .color(Theme.moonAccent.opacity(0.12)), lineWidth: 0.75)
        }
        .frame(width: size, height: size)
    }

    /// Build the illuminated area path, matching the web app's SVG arc approach exactly.
    ///
    /// The web app uses:
    /// - Waxing (phase 0→0.5): Right semicircle arc + terminator ellipse arc back
    /// - Waning (phase 0.5→1): Left semicircle arc + terminator ellipse arc back
    ///
    /// The terminator is an elliptical arc with rx = r * |1 - 2*illumination|
    /// When illumination < 0.5, the terminator bows inward (concave crescent)
    /// When illumination > 0.5, the terminator bows outward (gibbous)
    private func buildLitPath(cx: CGFloat, cy: CGFloat, r: CGFloat, normalizedPhase: Double) -> Path {
        let illumination = normalizedPhase <= 0.5 ? normalizedPhase * 2 : (1 - normalizedPhase) * 2
        let isWaxing = normalizedPhase <= 0.5
        let terminatorRx = max(abs(r * CGFloat(1 - 2 * illumination)), 0.01)

        var path = Path()

        if abs(normalizedPhase - 0.5) < 0.01 {
            // Full moon
            path.addEllipse(in: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2))
            return path
        }

        let top = CGPoint(x: cx, y: cy - r)

        path.move(to: top)

        if isWaxing {
            // Lit edge: right semicircle from top → bottom (clockwise visually = counterclockwise in SwiftUI)
            path.addArc(center: CGPoint(x: cx, y: cy), radius: r,
                        startAngle: .degrees(-90), endAngle: .degrees(90), clockwise: false)

            // Terminator: elliptical arc from bottom → top
            // SVG sweep: illumination <= 0.5 ? 0 : 1
            // sweep=0 → CCW → curves left (crescent: terminator bows toward center)
            // sweep=1 → CW → curves right (gibbous: terminator bows toward lit edge)
            let curveRight = illumination <= 0.5
            appendEllipseArc(to: &path, cx: cx, cy: cy, rx: terminatorRx, ry: r,
                            fromAngle: .pi / 2, toAngle: -.pi / 2, curveRight: curveRight)
        } else {
            // Lit edge: left semicircle from top → bottom (counterclockwise visually = clockwise in SwiftUI)
            path.addArc(center: CGPoint(x: cx, y: cy), radius: r,
                        startAngle: .degrees(-90), endAngle: .degrees(90), clockwise: true)

            // Terminator: elliptical arc from bottom → top
            // SVG sweep: illumination <= 0.5 ? 1 : 0
            // sweep=1 → CW → curves left in screen coords (crescent: terminator bows toward center)
            // sweep=0 → CCW → curves right in screen coords (gibbous: terminator bows toward lit edge)
            let curveRight = illumination > 0.5
            appendEllipseArc(to: &path, cx: cx, cy: cy, rx: terminatorRx, ry: r,
                            fromAngle: .pi / 2, toAngle: -.pi / 2, curveRight: curveRight)
        }

        path.closeSubpath()
        return path
    }

    /// Approximate an elliptical arc using many small line segments.
    /// Traces along an ellipse centered at (cx, cy) with horizontal radius rx and vertical radius ry.
    /// Goes from fromAngle to toAngle (in radians, measured from positive Y axis downward).
    /// curveRight=true means the ellipse bulges to the right of center; false means left.
    private func appendEllipseArc(to path: inout Path, cx: CGFloat, cy: CGFloat,
                                   rx: CGFloat, ry: CGFloat,
                                   fromAngle: CGFloat, toAngle: CGFloat,
                                   curveRight: Bool) {
        let segments = 64
        let sign: CGFloat = curveRight ? 1 : -1

        for i in 0...segments {
            let t = CGFloat(i) / CGFloat(segments)
            // Interpolate angle from fromAngle to toAngle
            let angle = fromAngle + t * (toAngle - fromAngle)
            // Ellipse parametric: x offset from center, y position
            let x = cx + sign * rx * cos(angle)
            let y = cy + ry * sin(angle)

            if i == 0 {
                path.addLine(to: CGPoint(x: x, y: y))
            } else {
                path.addLine(to: CGPoint(x: x, y: y))
            }
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        HStack(spacing: 16) {
            VStack {
                MoonPhaseIcon(phase: 0.0, size: 56)
                Text("New").font(.caption2).foregroundStyle(Theme.mutedForeground)
            }
            VStack {
                MoonPhaseIcon(phase: 0.12, size: 56)
                Text("Wax Cres").font(.caption2).foregroundStyle(Theme.mutedForeground)
            }
            VStack {
                MoonPhaseIcon(phase: 0.25, size: 56)
                Text("1st Qtr").font(.caption2).foregroundStyle(Theme.mutedForeground)
            }
            VStack {
                MoonPhaseIcon(phase: 0.38, size: 56)
                Text("Wax Gib").font(.caption2).foregroundStyle(Theme.mutedForeground)
            }
        }
        HStack(spacing: 16) {
            VStack {
                MoonPhaseIcon(phase: 0.5, size: 56)
                Text("Full").font(.caption2).foregroundStyle(Theme.mutedForeground)
            }
            VStack {
                MoonPhaseIcon(phase: 0.62, size: 56)
                Text("Wan Gib").font(.caption2).foregroundStyle(Theme.mutedForeground)
            }
            VStack {
                MoonPhaseIcon(phase: 0.75, size: 56)
                Text("3rd Qtr").font(.caption2).foregroundStyle(Theme.mutedForeground)
            }
            VStack {
                MoonPhaseIcon(phase: 0.88, size: 56)
                Text("Wan Cres").font(.caption2).foregroundStyle(Theme.mutedForeground)
            }
        }
    }
    .padding()
    .background(Theme.background)
}
