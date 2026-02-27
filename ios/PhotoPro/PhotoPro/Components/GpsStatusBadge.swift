import SwiftUI

struct GpsStatusBadge: View {
    var gpsEnabled: Bool
    var gpsStatus: GpsStatus
    var locationName: String?

    private var statusColor: Color {
        if !gpsEnabled { return Theme.mutedForeground }
        switch gpsStatus {
        case .granted: return .green
        case .requesting: return .orange
        case .denied: return .red
        case .error: return .red
        case .idle: return Theme.mutedForeground
        }
    }

    private var statusIcon: String {
        if !gpsEnabled { return "mappin" }
        switch gpsStatus {
        case .granted: return "location.fill"
        case .requesting: return "location.fill"
        case .denied: return "location.slash.fill"
        case .error: return "exclamationmark.triangle.fill"
        case .idle: return "location"
        }
    }

    private var displayName: String {
        if let name = locationName, !name.isEmpty {
            return name
        }
        return gpsEnabled ? "GPS" : "Manual"
    }

    var body: some View {
        HStack(spacing: 6) {
            // Status icon with color indicator
            Image(systemName: statusIcon)
                .font(.caption)
                .foregroundStyle(statusColor)

            Text(displayName)
                .font(.caption.weight(.medium))
                .foregroundStyle(Theme.foreground.opacity(0.8))
                .lineLimit(1)
        }
    }
}
