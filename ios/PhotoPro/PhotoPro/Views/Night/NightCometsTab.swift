import SwiftUI

struct NightCometsTab: View {
    @Environment(LocationStore.self) private var locationStore
    @Environment(WeatherStore.self) private var weatherStore

    private var comets: [CometEvent] {
        CometCalculator.getComets(userLatitude: locationStore.latitude)
    }

    var body: some View {
        VStack(spacing: Theme.spacingLG) {
            // Header
            HStack {
                Label("Comets", systemImage: "wind")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.cometAccent)
                Spacer()
            }

            if comets.isEmpty {
                VStack(spacing: Theme.spacingSM) {
                    Image(systemName: "wind")
                        .font(.largeTitle)
                        .foregroundStyle(Theme.mutedForeground.opacity(0.5))
                    Text("No notable comets currently visible")
                        .font(.subheadline)
                        .foregroundStyle(Theme.mutedForeground)
                    Text("Major comets are rare (a few per decade).\nCheck back when one is discovered!")
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground.opacity(0.7))
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 40)
            } else {
                ForEach(comets) { comet in
                    cometCard(comet)
                }
            }
        }
    }

    // MARK: - Card

    @ViewBuilder
    private func cometCard(_ comet: CometEvent) -> some View {
        let weatherScore = weatherStore.getScoreForTime(comet.peakDate, profile: .night)

        VStack(alignment: .leading, spacing: 12) {
            // Row 1: Title + magnitude badge
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        if comet.isActive {
                            Text("Visible now")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Theme.cometAccent)
                        } else {
                            Text(Formatting.formatDate(comet.peakDate))
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Theme.foreground)
                        }
                    }

                    Text(comet.name)
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                }

                Spacer()

                // Magnitude badge
                Text("Mag \(String(format: "%.1f", comet.peakMagnitude))")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color(red: 0.40, green: 0.89, blue: 0.96)) // cyan-300
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Theme.cometAccent.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .strokeBorder(Theme.cometAccent.opacity(0.2), lineWidth: 1)
                    )
            }

            // Row 2: Description
            Text(comet.description)
                .font(.caption)
                .foregroundStyle(Theme.mutedForeground)
                .fixedSize(horizontal: false, vertical: true)

            // Row 3: Metadata pills
            FlowLayout(spacing: 6) {
                metadataPill(comet.magnitudeRating, icon: "eye")
                if let time = comet.viewingTime {
                    metadataPill(time, icon: "clock")
                }
                if let dir = comet.viewingDirection {
                    metadataPill("Look \(dir)", icon: "safari")
                }
            }

            // Row 4: Weather badge
            if let score = weatherScore {
                WeatherBadge(score: score.score)
            }
        }
        .surfaceCard(accent: Theme.cometAccent)
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
