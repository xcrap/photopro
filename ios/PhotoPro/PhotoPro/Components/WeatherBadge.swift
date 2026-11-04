import SwiftUI

/// Weather score pill. Tapping it (or activating it with VoiceOver) shows the breakdown:
/// label, summary and sub-scores — the same content as the web tooltip.
struct WeatherBadge: View {
    var conditions: ScoredConditions
    var compact: Bool = false

    @State private var showingBreakdown = false

    private var score: Int { conditions.score }

    var body: some View {
        Button {
            showingBreakdown = true
        } label: {
            HStack(spacing: 4) {
                Image(systemName: WeatherScoring.getScoreIcon(score))
                    .font(.caption2)
                if !compact {
                    Text("\(score)")
                        .font(.caption2.weight(.medium).monospacedDigit())
                }
            }
            .padding(.horizontal, compact ? 6 : 8)
            .padding(.vertical, 3)
            .background(Theme.scoreColor(for: score).opacity(0.15))
            .foregroundStyle(Theme.scoreColor(for: score))
            .clipShape(Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Weather score \(score), \(conditions.rating)")
        .accessibilityValue(conditions.summary)
        .accessibilityHint("Shows the score breakdown")
        .popover(isPresented: $showingBreakdown) {
            WeatherScoreBreakdown(conditions: conditions)
                .presentationCompactAdaptation(.popover)
        }
    }
}

/// Label, summary and sub-scores for a scored hour.
struct WeatherScoreBreakdown: View {
    let conditions: ScoredConditions

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: WeatherScoring.getScoreIcon(conditions.score))
                    .foregroundStyle(Theme.scoreColor(for: conditions.score))
                    .accessibilityHidden(true)
                Text("\(conditions.rating) conditions")
                    .font(.subheadline.weight(.semibold))
                Spacer(minLength: 8)
                Text("\(conditions.score)/100")
                    .font(.subheadline.weight(.semibold).monospacedDigit())
                    .foregroundStyle(Theme.scoreColor(for: conditions.score))
            }

            Text(conditions.summary)
                .font(.caption)
                .foregroundStyle(Theme.foreground.opacity(0.85))
                .fixedSize(horizontal: false, vertical: true)

            Text("\(conditions.profile.rawValue.capitalized) profile")
                .font(.caption2.weight(.medium))
                .foregroundStyle(Theme.mutedForeground)

            VStack(alignment: .leading, spacing: 4) {
                ForEach(conditions.breakdown, id: \.self) { component in
                    HStack {
                        Text(component.label)
                        Spacer(minLength: 16)
                        Text("\(component.value)")
                            .monospacedDigit()
                    }
                    .font(.caption)
                    .foregroundStyle(Theme.foreground.opacity(0.9))
                    .accessibilityElement(children: .combine)
                }
            }
        }
        .padding(14)
        .frame(minWidth: 220, idealWidth: 240)
        .preferredColorScheme(.dark)
    }
}

#Preview {
    let weather = HourlyWeather(time: Date(), windSpeed: 6, cloudCover: 20, cloudCoverLow: 10,
                                cloudCoverMid: 5, cloudCoverHigh: 50, humidity: 70)
    HStack {
        WeatherBadge(conditions: WeatherScoring.scoreWeatherConditions(profile: .sunset, weather: weather))
        WeatherBadge(conditions: WeatherScoring.scoreWeatherConditions(profile: .night, weather: weather), compact: true)
    }
    .padding()
    .background(Theme.background)
}
