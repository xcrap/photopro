import SwiftUI

struct NightMeteorsTab: View {
    @Environment(LocationStore.self) private var locationStore
    @Environment(WeatherStore.self) private var weatherStore

    private var showers: [MeteorShowerEvent] {
        MeteorCalculator.getUpcomingMeteorShowers(fromDate: Date(), months: 12, userLatitude: locationStore.latitude)
    }

    var body: some View {
        VStack(spacing: Theme.spacingLG) {
            // Header
            HStack {
                Label("Upcoming Meteor Showers", systemImage: "sparkle")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color(red: 0.50, green: 0.55, blue: 1.0)) // indigo-400
                Spacer()
            }

            if showers.isEmpty {
                VStack(spacing: Theme.spacingSM) {
                    Image(systemName: "sparkle")
                        .font(.largeTitle)
                        .foregroundStyle(Theme.mutedForeground.opacity(0.5))
                    Text("No upcoming meteor showers")
                        .font(.subheadline)
                        .foregroundStyle(Theme.mutedForeground)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 40)
            } else {
                ForEach(showers) { shower in
                    meteorCard(shower)
                }
            }
        }
    }

    // MARK: - Card

    @ViewBuilder
    private func meteorCard(_ shower: MeteorShowerEvent) -> some View {
        let weatherScore = weatherStore.getScoreForTime(shower.peakDate, profile: .night)

        VStack(alignment: .leading, spacing: 12) {
            // Row 1: Date + active badge + stars
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        Text(Formatting.formatDate(shower.peakDate))
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Theme.foreground)

                        if shower.isActive {
                            Text("Active now")
                                .font(.caption2.weight(.medium))
                                .foregroundStyle(Color(red: 0.20, green: 0.83, blue: 0.60)) // emerald-400
                        }
                    }

                    Text(shower.name)
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Theme.foreground.opacity(0.8))
                }

                Spacer()

                // Star rating
                HStack(spacing: 2) {
                    let rating = MeteorCalculator.getZhrRating(shower.zhr)
                    ForEach(0..<3, id: \.self) { i in
                        Image(systemName: i < rating ? "star.fill" : "star.fill")
                            .font(.caption2)
                            .foregroundStyle(
                                i < rating
                                    ? Theme.sunAccent
                                    : Color.white.opacity(0.1)
                            )
                    }
                }
            }

            // Row 2: Description
            Text(shower.description)
                .font(.caption)
                .foregroundStyle(Theme.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)

            // Row 3: Metadata pills
            FlowLayout(spacing: 6) {
                metadataPill("ZHR: \(shower.zhr)/hour")
                metadataPill("🌖 \(Int(shower.moonIllumination))% moon")
                metadataPill(shower.visibilityRating, icon: "eye")
            }

            // Row 4: Weather badge
            if let score = weatherScore {
                WeatherBadge(score: score.score)
            }
        }
        .surfaceCard(accent: Theme.sunAccent)
    }

    // MARK: - Pill

    @ViewBuilder
    private func metadataPill(_ text: String, icon: String? = nil) -> some View {
        HStack(spacing: 4) {
            if let icon {
                Image(systemName: icon)
                    .font(.caption2)
            }
            Text(text)
                .font(.caption2)
        }
        .foregroundStyle(Theme.foreground.opacity(0.7))
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Color.white.opacity(0.03))
        .clipShape(Capsule())
        .overlay(Capsule().strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
    }
}

// MARK: - Flow Layout

/// A simple flow layout that wraps items horizontally.
struct FlowLayout: Layout {
    var spacing: CGFloat = 6

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = computeLayout(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = computeLayout(proposal: ProposedViewSize(width: bounds.width, height: bounds.height), subviews: subviews)
        for (index, offset) in result.offsets.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + offset.x, y: bounds.minY + offset.y), proposal: .unspecified)
        }
    }

    private func computeLayout(proposal: ProposedViewSize, subviews: Subviews) -> (offsets: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var offsets: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            offsets.append(CGPoint(x: currentX, y: currentY))
            lineHeight = max(lineHeight, size.height)
            currentX += size.width + spacing
            maxX = max(maxX, currentX - spacing)
        }

        return (offsets, CGSize(width: maxX, height: currentY + lineHeight))
    }
}
