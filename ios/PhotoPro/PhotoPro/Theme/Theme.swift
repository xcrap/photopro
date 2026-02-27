import SwiftUI

enum Theme {
    // MARK: - Base Colors
    static let background = Color(red: 0.008, green: 0.016, blue: 0.039)   // #02040a
    static let foreground = Color(red: 0.98, green: 0.98, blue: 0.98)      // #fafafa
    static let card = Color(red: 0.035, green: 0.035, blue: 0.043)         // #09090b
    static let cardForeground = Color(red: 0.98, green: 0.98, blue: 0.98)  // #fafafa

    // MARK: - Primary
    static let primary = Color(red: 0.659, green: 0.722, blue: 0.847)      // #a8b8d8
    static let primaryForeground = Color(red: 0.008, green: 0.016, blue: 0.039)

    // MARK: - Secondary & Muted
    static let secondary = Color(red: 0.122, green: 0.161, blue: 0.216)    // #1f2937
    static let secondaryForeground = Color(red: 0.953, green: 0.957, blue: 0.965) // #f3f4f6
    static let muted = Color(red: 0.122, green: 0.161, blue: 0.216)        // #1f2937
    static let mutedForeground = Color(red: 0.612, green: 0.639, blue: 0.686) // #9ca3af

    // MARK: - Feature Accents
    static let moonAccent = Color(red: 0.659, green: 0.722, blue: 0.847)   // #a8b8d8
    static let sunAccent = Color(red: 0.984, green: 0.749, blue: 0.141)    // #fbbf24
    static let eclipseAccent = Color(red: 0.957, green: 0.447, blue: 0.718) // #f472b6
    static let proximityAccent = Color(red: 0.176, green: 0.831, blue: 0.749) // #2dd4bf
    static let cometAccent = Color(red: 0.133, green: 0.827, blue: 0.933)  // #22d3ee

    // MARK: - Status
    static let destructive = Color(red: 0.937, green: 0.267, blue: 0.267)  // #ef4444
    static let border = Color(red: 0.122, green: 0.161, blue: 0.216)       // #1f2937

    // MARK: - Score Colors (matching web app: emerald, sky, amber, zinc)
    static let scoreExcellent = Color(red: 0.42, green: 0.87, blue: 0.60)  // emerald-400
    static let scoreGood = Color(red: 0.49, green: 0.73, blue: 0.95)       // sky-400
    static let scoreFair = Color(red: 0.98, green: 0.82, blue: 0.40)       // amber-300
    static let scorePoor = Color(red: 0.63, green: 0.65, blue: 0.68)       // zinc-400

    // MARK: - Surface Styles
    static func surfaceBackground(accent: Color = .white) -> some ShapeStyle {
        LinearGradient(
            colors: [accent.opacity(0.05), Color.white.opacity(0.01)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Typography
    static let titleFont: Font = .title2.weight(.medium)
    static let headlineFont: Font = .headline.weight(.medium)
    static let bodyFont: Font = .body
    static let captionFont: Font = .caption
    static let caption2Font: Font = .caption2

    // MARK: - Spacing
    static let spacingXS: CGFloat = 4
    static let spacingSM: CGFloat = 8
    static let spacingMD: CGFloat = 12
    static let spacingLG: CGFloat = 16
    static let spacingXL: CGFloat = 24
    static let spacingXXL: CGFloat = 32

    // MARK: - Corner Radius
    static let radiusSM: CGFloat = 8
    static let radiusMD: CGFloat = 12
    static let radiusLG: CGFloat = 16
    static let radiusXL: CGFloat = 20

    // MARK: - Score Helpers
    static func scoreColor(for score: Int) -> Color {
        switch score {
        case 85...100: return scoreExcellent
        case 70..<85: return scoreGood
        case 50..<70: return scoreFair
        default: return scorePoor
        }
    }

    static func scoreLabel(for score: Int) -> String {
        switch score {
        case 85...100: return "Excellent"
        case 70..<85: return "Good"
        case 50..<70: return "Fair"
        default: return "Poor"
        }
    }
}

// MARK: - Surface Card Modifier
struct SurfaceModifier: ViewModifier {
    var accent: Color

    func body(content: Content) -> some View {
        content
            .padding(.horizontal, Theme.spacingXL)
            .padding(.vertical, Theme.spacingXL)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.surfaceBackground(accent: accent))
            .clipShape(RoundedRectangle(cornerRadius: Theme.radiusXL))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.radiusXL)
                    .strokeBorder(accent.opacity(0.1), lineWidth: 1)
            )
    }
}

extension View {
    func surfaceCard(accent: Color = .white) -> some View {
        modifier(SurfaceModifier(accent: accent))
    }
}
