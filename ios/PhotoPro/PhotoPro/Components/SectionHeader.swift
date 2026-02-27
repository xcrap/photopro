import SwiftUI

struct SectionHeader: View {
    var title: String
    var description: String?
    var action: (() -> Void)?
    var actionLabel: String?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.title2.weight(.medium))
                    .tracking(-0.5)
                    .foregroundStyle(Theme.foreground)
                if let description {
                    Text(description)
                        .font(.subheadline)
                        .foregroundStyle(Theme.mutedForeground)
                }
            }
            Spacer()
            if let action, let actionLabel {
                Button(actionLabel, action: action)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Theme.primary)
            }
        }
    }
}
