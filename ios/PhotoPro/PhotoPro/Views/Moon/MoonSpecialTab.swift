import SwiftUI

struct MoonSpecialTab: View {
    private var events: [SpecialEvent] {
        SpecialEvents.findSpecialEvents(startDate: Date(), months: 24)
    }

    var body: some View {
        if events.isEmpty {
            VStack(spacing: Theme.spacingSM) {
                Image(systemName: "sparkles")
                    .font(.largeTitle)
                    .foregroundStyle(Theme.mutedForeground.opacity(0.5))
                Text("No special events found")
                    .font(.subheadline)
                    .foregroundStyle(Theme.mutedForeground)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 60)
        } else {
            LazyVStack(spacing: Theme.spacingLG) {
                ForEach(events) { event in
                    VStack(alignment: .leading, spacing: Theme.spacingMD) {
                        // Header
                        HStack {
                            Image(systemName: iconFor(event.type))
                                .foregroundStyle(colorFor(event.type))
                            Text(event.name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Theme.foreground)
                            Spacer()
                            Text(Formatting.formatDaysUntil(event.date))
                                .font(.caption.weight(.medium).monospacedDigit())
                                .foregroundStyle(Theme.mutedForeground)
                        }

                        // Date
                        Text(Formatting.formatDate(event.date))
                            .font(.caption)
                            .foregroundStyle(Theme.mutedForeground)

                        // Description
                        Text(event.description)
                            .font(.caption)
                            .foregroundStyle(Theme.foreground.opacity(0.7))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .surfaceCard(accent: colorFor(event.type))
                }
            }
        }
    }

    private func iconFor(_ type: SpecialEventType) -> String {
        switch type {
        case .supermoon: return "moon.stars.fill"
        case .blueMoon: return "moon.fill"
        case .microMoon: return "moon"
        case .blackMoon: return "moon.circle"
        }
    }

    private func colorFor(_ type: SpecialEventType) -> Color {
        switch type {
        case .supermoon: return Theme.sunAccent
        case .blueMoon: return .blue
        case .microMoon: return Theme.mutedForeground
        case .blackMoon: return .purple
        }
    }
}
