import SwiftUI

struct SunEclipsesTab: View {
    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore
    @Environment(WeatherStore.self) private var weatherStore
    @State private var visibleOnly = true

    private var eclipses: [EclipseEvent] {
        let solar = EclipseCalculator.loadSolarEclipses()
        return EclipseCalculator.getUpcomingEclipses(
            lunarData: [], solarData: solar,
            yearsRange: settingsStore.eclipseYearsRange
        )
    }

    var body: some View {
        VStack(spacing: Theme.spacingLG) {
            // Header row
            HStack {
                Label("Solar Eclipses", systemImage: "sun.max.circle")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.eclipseAccent)
                Spacer()
                Text("Visible")
                    .font(.caption2)
                    .foregroundStyle(Theme.mutedForeground)
                Toggle("Visible", isOn: $visibleOnly)
                    .toggleStyle(.switch)
                    .labelsHidden()
                    .tint(.green)
            }

            let filtered = visibleOnly ? eclipses.filter {
                EclipseCalculator.getVisibilityForLocation($0, lat: locationStore.latitude, lon: locationStore.longitude) > 0
            } : eclipses

            if filtered.isEmpty {
                VStack(spacing: Theme.spacingSM) {
                    Image(systemName: "sun.max.circle")
                        .font(.largeTitle)
                        .foregroundStyle(Theme.mutedForeground.opacity(0.5))
                    Text("No solar eclipses in the selected range")
                        .font(.subheadline)
                        .foregroundStyle(Theme.mutedForeground)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 40)
            } else {
                ForEach(filtered) { eclipse in
                    eclipseCard(eclipse)
                }
            }
        }
    }

    // MARK: - Card

    @ViewBuilder
    private func eclipseCard(_ eclipse: EclipseEvent) -> some View {
        let visibility = EclipseCalculator.getVisibilityForLocation(
            eclipse, lat: locationStore.latitude, lon: locationStore.longitude
        )
        let weatherScore = weatherStore.getScoreForTime(eclipse.date, profile: .sunset)

        VStack(alignment: .leading, spacing: 12) {
            // Row 1: Date + weather badge + type badge
            HStack(alignment: .center) {
                Text(Formatting.formatDate(eclipse.date))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.foreground)

                Spacer()

                if let score = weatherScore {
                    WeatherBadge(score: score.score, compact: true)
                }

                Text(eclipse.type.rawValue.uppercased())
                    .font(.caption2.weight(.semibold))
                    .tracking(0.5)
                    .foregroundStyle(eclipseTypeColor(eclipse.type))
            }

            // Row 2: Subtitle
            Text("\(eclipse.type.rawValue.capitalized) Solar Eclipse · Peak \(eclipse.peakTime)")
                .font(.caption)
                .foregroundStyle(Theme.foreground.opacity(0.6))

            // Row 3: Description
            Text(eclipse.description)
                .font(.caption)
                .foregroundStyle(Theme.foreground.opacity(0.5))
                .fixedSize(horizontal: false, vertical: true)

            // Row 4: Visibility bar
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 0) {
                    Text("Visibility")
                        .font(.caption2)
                        .foregroundStyle(Theme.mutedForeground.opacity(0.7))
                    Spacer()
                    Text(visibility > 0 ? "\(Int(visibility))%" : "—")
                        .font(.callout.weight(.bold).monospacedDigit())
                        .foregroundStyle(Theme.foreground)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.white.opacity(0.06))
                            .frame(height: 5)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(visibility > 0 ? Theme.eclipseAccent : Theme.mutedForeground)
                            .frame(width: geo.size.width * CGFloat(visibility / 100), height: 5)
                    }
                }
                .frame(height: 5)
            }

            // Row 5: Stats
            HStack(spacing: 0) {
                Text("Duration \(eclipse.duration)")
                Text("  |  ").foregroundStyle(.white.opacity(0.1))
                Text(String(format: "Magnitude %.2f", eclipse.magnitude))
            }
            .font(.caption.monospacedDigit())
            .foregroundStyle(Theme.foreground.opacity(0.5))
        }
        .surfaceCard(accent: Theme.eclipseAccent)
    }

    // MARK: - Helpers

    private func eclipseTypeColor(_ type: EclipseType) -> Color {
        switch type {
        case .total: return Color(red: 0.99, green: 0.45, blue: 0.45)     // red-300
        case .partial: return Color(red: 0.99, green: 0.88, blue: 0.54)   // amber-200
        case .annular: return Color(red: 0.99, green: 0.76, blue: 0.54)   // orange-200
        case .penumbral: return Theme.mutedForeground
        }
    }
}
