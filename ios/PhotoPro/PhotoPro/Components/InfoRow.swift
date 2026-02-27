import SwiftUI

struct InfoRow: View {
    var icon: String? // SF Symbol name
    var label: String
    var value: String
    var sublabel: String?

    var body: some View {
        HStack {
            HStack(spacing: 12) {
                if let icon {
                    Image(systemName: icon)
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                        .frame(width: 28, height: 28)
                        .background(Color.white.opacity(0.03))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(label)
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                    if let sublabel {
                        Text(sublabel)
                            .font(.caption2)
                            .foregroundStyle(Theme.mutedForeground.opacity(0.4))
                    }
                }
            }
            Spacer()
            Text(value)
                .font(.subheadline.weight(.medium).monospacedDigit())
                .foregroundStyle(Theme.foreground.opacity(0.9))
        }
        .padding(.vertical, 10)
    }
}

#Preview {
    VStack {
        InfoRow(icon: "sunrise", label: "Sunrise", value: "6:42 AM")
        InfoRow(icon: "sunset", label: "Sunset", value: "7:15 PM", sublabel: "Golden hour starts at 6:30 PM")
    }
    .padding()
    .background(Theme.background)
}
