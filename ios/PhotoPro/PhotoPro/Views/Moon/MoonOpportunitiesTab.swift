import SwiftUI

struct MoonOpportunitiesTab: View {
    @Environment(LocationStore.self) private var locationStore
    @Environment(WeatherStore.self) private var weatherStore
    @Environment(SettingsStore.self) private var settingsStore
    @State private var goodWeatherOnly = false
    /// 365-day scan, recomputed off the main thread only when the day or location changes.
    @State private var events: [ProximityEvent] = []
    @State private var isScanning = true

    private var scanKey: String {
        let timeZone = locationStore.timeZone
        let day = Formatting.string(from: Date(), pattern: "yyyy-MM-dd", timeZone: timeZone)
        return "\(locationStore.coordinateKey)|\(timeZone.identifier)|\(day)"
    }

    /// Weather for an opportunity = sunset profile at the Sun event time (ALGORITHM.md → "Opportunity ranking").
    private func weatherScore(for event: ProximityEvent) -> ScoredConditions? {
        weatherStore.getScoreForTime(event.sunTime, profile: .sunset, moonIllumination: event.moonIllumination)
    }

    var body: some View {
        let now = Date()
        let upcoming = events.filter { $0.sunTime > now }
        let filtered = goodWeatherOnly
            ? upcoming.filter { (weatherScore(for: $0)?.score ?? 0) >= 70 }
            : upcoming

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

            if isScanning && events.isEmpty {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.top, 40)
            } else if filtered.isEmpty {
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
        .task(id: scanKey) {
            isScanning = true
            let lat = locationStore.latitude
            let lon = locationStore.longitude
            let timeZone = locationStore.timeZone
            events = await Task.detached(priority: .userInitiated) {
                ProximityFinder.findProximityEvents(startDate: Date(), days: 365, lat: lat, lon: lon, timeZone: timeZone)
            }.value
            isScanning = false
        }
    }

    // MARK: - Card

    @ViewBuilder
    private func opportunityCard(_ event: ProximityEvent) -> some View {
        let weather = weatherScore(for: event)
        let combined = combinedScore(event: event, weather: weather?.score)
        let timeZone = locationStore.timeZone

        VStack(alignment: .leading, spacing: 12) {
            // Row 1: Date + badges
            HStack(alignment: .center) {
                Text(Formatting.formatDate(event.date, timeZone: timeZone))
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
                Text("\(Int(event.moonIllumination.rounded()))% lit")
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
            Text(Formatting.formatTime(time, format: settingsStore.timeFormat, timeZone: locationStore.timeZone))
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
