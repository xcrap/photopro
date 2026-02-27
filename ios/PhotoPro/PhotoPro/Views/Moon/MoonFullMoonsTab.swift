import SwiftUI

struct MoonFullMoonsTab: View {
    @Environment(LocationStore.self) private var locationStore
    @Environment(WeatherStore.self) private var weatherStore

    private var fullMoons: [FullMoonEvent] {
        FullMoonFinder.findFullMoons(startDate: Date(), months: 12)
    }

    var body: some View {
        LazyVStack(spacing: Theme.spacingMD) {
            ForEach(fullMoons) { moon in
                HStack(spacing: Theme.spacingMD) {
                    MoonPhaseIcon(phase: 0.5, size: 40)

                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text(moon.folkName)
                                .font(.subheadline.weight(.medium))
                            if moon.isSupermoon {
                                Text("Supermoon")
                                    .font(.caption2.weight(.medium))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Theme.sunAccent.opacity(0.15))
                                    .foregroundStyle(Theme.sunAccent)
                                    .clipShape(Capsule())
                            }
                        }
                        Text(Formatting.formatDate(moon.date))
                            .font(.caption)
                            .foregroundStyle(Theme.mutedForeground)
                        if let distance = moon.distance {
                            Text(Formatting.formatDistance(distance))
                                .font(.caption2)
                                .foregroundStyle(Theme.mutedForeground.opacity(0.7))
                        }
                    }

                    Spacer()

                    if let score = weatherStore.getScoreForTime(moon.date, profile: .night) {
                        WeatherBadge(score: score.score, compact: true)
                    }

                    Text(Formatting.formatDaysUntil(moon.date))
                        .font(.caption.weight(.medium).monospacedDigit())
                        .foregroundStyle(Theme.mutedForeground)
                }
                .padding(.vertical, Theme.spacingMD)
            }
        }
    }
}
