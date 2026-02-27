import SwiftUI

struct WeatherBadge: View {
    var score: Int
    var compact: Bool = false

    var body: some View {
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
    }
}

#Preview {
    HStack {
        WeatherBadge(score: 90)
        WeatherBadge(score: 72)
        WeatherBadge(score: 55)
        WeatherBadge(score: 30)
    }
    .padding()
    .background(Theme.background)
}
