import SwiftUI

struct EventCard: View {
    var icon: String // SF Symbol
    var iconColor: Color = Theme.primary
    var title: String
    var subtitle: String?
    var detail: String?
    var trailing: String?
    var trailingColor: Color?

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(iconColor)
                .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Theme.foreground)
                if let subtitle {
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                }
                if let detail {
                    Text(detail)
                        .font(.caption2)
                        .foregroundStyle(Theme.mutedForeground.opacity(0.7))
                }
            }

            Spacer()

            if let trailing {
                Text(trailing)
                    .font(.caption.weight(.medium).monospacedDigit())
                    .foregroundStyle(trailingColor ?? Theme.mutedForeground)
            }
        }
        .padding(.vertical, Theme.spacingSM)
    }
}
