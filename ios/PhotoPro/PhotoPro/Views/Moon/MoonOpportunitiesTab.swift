import SwiftUI

struct MoonOpportunitiesTab: View {
    @Environment(LocationStore.self) private var locationStore
    @Environment(WeatherStore.self) private var weatherStore
    @Environment(SettingsStore.self) private var settingsStore
    @State private var goodWeatherOnly = false

    private var events: [ProximityEvent] {
        ProximityFinder.findProximityEvents(
            startDate: Date(), days: 365,
            lat: locationStore.latitude, lon: locationStore.longitude
        )
    }

    private var filtered: [ProximityEvent] {
        if goodWeatherOnly {
            return events.filter { event in
                if let score = weatherStore.getScoreForTime(event.date, profile: .sunset) {
                    return score.score >= 70
                }
                return false
            }
        }
        return events
    }

    var body: some View {
        VStack(spacing: Theme.spacingLG) {
            // Header row
            HStack {
                Label("Opportunities", systemImage: "camera.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.proximityAccent)
                Spacer()
                Text("Good weather")
                    .font(.caption2)
                    .foregroundStyle(Theme.mutedForeground)
                Toggle("Good weather", isOn: $goodWeatherOnly)
                    .toggleStyle(.switch)
                    .labelsHidden()
                    .tint(.green)
            }

            if filtered.isEmpty {
                VStack(spacing: Theme.spacingSM) {
                    Image(systemName: "camera")
                        .font(.largeTitle)
                        .foregroundStyle(Theme.mutedForeground.opacity(0.5))
                    Text(goodWeatherOnly ? "No events with good weather" : "No proximity events found")
                        .font(.subheadline)
                        .foregroundStyle(Theme.mutedForeground)
                    Text("Moon and sun rise/set events within 30 min and 30° will appear here")
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground.opacity(0.7))
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 40)
            } else {
                ForEach(filtered) { event in
                    opportunityCard(event)
                }
            }
        }
    }

    // MARK: - Card

    @ViewBuilder
    private func opportunityCard(_ event: ProximityEvent) -> some View {
        let weatherScore = weatherStore.getScoreForTime(event.date, profile: .sunset)
        let combined = combinedScore(event: event, weather: weatherScore?.score)

        VStack(alignment: .leading, spacing: 12) {
            // Row 1: Date + badges
            HStack(alignment: .center) {
                Text(Formatting.formatDate(event.date))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.foreground)

                Spacer()

                // Combined score pill
                Text("Combined \(combined)")
                    .font(.caption2.weight(.semibold).monospacedDigit())
                    .foregroundStyle(Theme.proximityAccent)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Theme.proximityAccent.opacity(0.1))
                    .clipShape(Capsule())
                    .overlay(Capsule().strokeBorder(Theme.proximityAccent.opacity(0.2), lineWidth: 1))

                // Type label
                Text(event.type.label)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(qualityColor(event.quality))
            }

            // Row 2: Two time boxes
            HStack(spacing: 10) {
                timeBox(label: event.type.moonLabel, time: event.moonTime)
                timeBox(label: event.type.sunLabel, time: event.sunTime)
            }

            // Row 3: Stats
            HStack(spacing: 0) {
                Text(String(format: "%.1f° apart", event.azimuthDiff))
                Text("  |  ").foregroundStyle(.white.opacity(0.1))
                Text("\(Int(event.timeDiffMinutes.rounded())) min gap")
                Text("  |  ").foregroundStyle(.white.opacity(0.1))
                Text("\(Int(event.moonIllumination))% lit")
            }
            .font(.caption.monospacedDigit())
            .foregroundStyle(Theme.foreground.opacity(0.7))

            // Row 4: Context line
            HStack(spacing: 0) {
                Text(event.timingDescription)
                    .foregroundStyle(Theme.mutedForeground.opacity(0.6))
                Text("  ·  ").foregroundStyle(Theme.mutedForeground.opacity(0.3))
                Text(event.quality.label)
                    .foregroundStyle(qualityColor(event.quality))
            }
            .font(.caption)
        }
        .surfaceCard(accent: Theme.proximityAccent)
    }

    // MARK: - Time Box

    @ViewBuilder
    private func timeBox(label: String, time: Date) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(Theme.mutedForeground.opacity(0.7))
            Text(Formatting.formatTime(time, format: settingsStore.timeFormat))
                .font(.title3.weight(.semibold).monospacedDigit())
                .foregroundStyle(Theme.foreground)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Helpers

    private func qualityColor(_ quality: ProximityQuality) -> Color {
        switch quality {
        case .excellent: return .green
        case .good: return Theme.proximityAccent
        case .fair: return Theme.mutedForeground
        }
    }

    private func combinedScore(event: ProximityEvent, weather: Int?) -> Int {
        let astro = event.astronomyScore
        if let w = weather {
            return Int((Double(astro) * 0.5 + Double(w) * 0.5).rounded())
        }
        return astro
    }
}
