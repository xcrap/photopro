import SwiftUI

struct WeatherPage: View {
    @Environment(LocationStore.self) private var locationStore
    @Environment(WeatherStore.self) private var weatherStore
    @Environment(SettingsStore.self) private var settingsStore

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.spacingXL) {
                // Header
                HStack {
                    SectionHeader(
                        title: "7-Day Photo Forecast",
                        description: "Best conditions for photography"
                    )
                    Spacer()
                    Button {
                        Task {
                            await weatherStore.fetchForecast(
                                latitude: locationStore.latitude,
                                longitude: locationStore.longitude,
                                force: true
                            )
                        }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.body)
                            .foregroundStyle(Theme.mutedForeground)
                    }
                    .disabled(weatherStore.isLoading)
                }

                if let lastUpdated = weatherStore.lastUpdated {
                    Text("Updated at \(Formatting.formatTime(lastUpdated, format: settingsStore.timeFormat))")
                        .font(.caption2)
                        .foregroundStyle(Theme.mutedForeground.opacity(0.5))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                if weatherStore.isLoading && weatherStore.forecast == nil {
                    ProgressView("Loading forecast...")
                        .frame(maxWidth: .infinity)
                        .padding(.top, 40)
                } else if let error = weatherStore.error, weatherStore.forecast == nil {
                    VStack(spacing: Theme.spacingSM) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.title)
                            .foregroundStyle(.orange)
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(Theme.mutedForeground)
                    }
                    .padding(.top, 40)
                } else {
                    ForEach(weatherStore.dailyScores) { day in
                        DayScoreCard(day: day)
                    }
                }
            }
            .padding(.horizontal, Theme.spacingLG)
            .padding(.vertical, Theme.spacingMD)
        }
        .background(Theme.background)
        .navigationTitle("Weather")
        .toolbarTitleDisplayMode(.inline)
        .task {
            if weatherStore.forecast == nil {
                await weatherStore.fetchForecast(
                    latitude: locationStore.latitude,
                    longitude: locationStore.longitude
                )
            }
        }
    }
}

// MARK: - Day Score Card

struct DayScoreCard: View {
    let day: DailyPhotoScore

    @Environment(SettingsStore.self) private var settingsStore

    private var accentColor: Color {
        Theme.scoreColor(for: day.score)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.spacingLG) {
            // Top row: date + score badge
            HStack {
                Text(dayName)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.foreground)

                Spacer()

                // Score badge
                HStack(spacing: 6) {
                    Image(systemName: WeatherScoring.getScoreIcon(day.score))
                        .font(.caption2)
                    Text(day.conditions.rating)
                        .font(.caption.weight(.semibold))
                    Text("\(day.score)/100")
                        .font(.caption2.weight(.medium).monospacedDigit())
                        .foregroundStyle(accentColor.opacity(0.7))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(accentColor.opacity(0.1))
                .foregroundStyle(accentColor)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusSM))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.radiusSM)
                        .strokeBorder(accentColor.opacity(0.25), lineWidth: 1)
                )
            }

            // Pill badges
            HStack(spacing: Theme.spacingSM) {
                PillBadge(
                    text: "Best \(Formatting.formatTime(day.bestTime, format: settingsStore.timeFormat))",
                    foreground: Theme.foreground.opacity(0.8)
                )
                PillBadge(
                    text: "\(day.bestProfile.rawValue.capitalized) profile",
                    foreground: Theme.foreground.opacity(0.7)
                )

                Spacer()

                // Trend
                trendView
            }

            // Summary
            VStack(alignment: .leading, spacing: 4) {
                Text(day.conditions.summary)
                    .font(.subheadline)
                    .foregroundStyle(Theme.foreground.opacity(0.85))
                    .fixedSize(horizontal: false, vertical: true)

                Text(day.bestProfile == .sunset
                     ? "Scored for sunset: wind + high cloud color + low/mid cloud blocking."
                     : "Scored for night: clear sky + low wind + humidity + moon darkness.")
                    .font(.caption2)
                    .foregroundStyle(Theme.foreground.opacity(0.45))
                    .fixedSize(horizontal: false, vertical: true)
            }

            // Metric cards - full width row
            HStack(spacing: Theme.spacingSM) {
                IconMetric(icon: "wind", label: "Wind",
                           value: "\(Int(day.conditions.windSpeed.rounded())) km/h")
                IconMetric(icon: "cloud", label: "Clouds",
                           value: "\(day.conditions.cloudCover)%")
                IconMetric(icon: "humidity", label: "Humidity",
                           value: "\(day.conditions.humidity)%")
            }
            .frame(maxWidth: .infinity)
        }
        .surfaceCard(accent: day.score >= 85 ? Theme.scoreExcellent : day.score >= 70 ? Theme.scoreGood : .white)
    }

    @ViewBuilder
    private var trendView: some View {
        switch day.trend {
        case .improving:
            Text("↗ +\(day.trendDelta)")
                .font(.caption2.weight(.medium))
                .foregroundStyle(Theme.scoreExcellent.opacity(0.9))
        case .declining:
            Text("↘ \(day.trendDelta)")
                .font(.caption2.weight(.medium))
                .foregroundStyle(Theme.scoreFair.opacity(0.9))
        case .steady:
            Text("→ steady")
                .font(.caption2)
                .foregroundStyle(Theme.foreground.opacity(0.45))
        }
    }

    private var dayName: String {
        let calendar = Calendar.current
        if calendar.isDateInToday(day.displayDate) { return "Today" }
        if calendar.isDateInTomorrow(day.displayDate) { return "Tomorrow" }
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d"
        return formatter.string(from: day.displayDate)
    }
}

// MARK: - Pill Badge

struct PillBadge: View {
    let text: String
    var foreground: Color = Theme.foreground.opacity(0.8)

    var body: some View {
        Text(text)
            .font(.caption2)
            .foregroundStyle(foreground)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(Color.white.opacity(0.03))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .strokeBorder(Color.white.opacity(0.1), lineWidth: 1)
            )
    }
}

// MARK: - Icon Metric Card

struct IconMetric: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.callout)
                .foregroundStyle(Theme.foreground.opacity(0.75))

            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(Theme.foreground.opacity(0.5))
                .textCase(.uppercase)
                .tracking(0.4)

            Text(value)
                .font(.caption.weight(.semibold).monospacedDigit())
                .foregroundStyle(Theme.foreground.opacity(0.9))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.04))
        .clipShape(RoundedRectangle(cornerRadius: Theme.radiusMD))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.radiusMD)
                .strokeBorder(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
}
