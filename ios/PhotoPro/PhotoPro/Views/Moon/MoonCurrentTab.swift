import SwiftUI

struct MoonCurrentTab: View {
    @Binding var selectedDate: Date
    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore

    private var moonData: MoonData {
        MoonCalculator.getMoonData(date: selectedDate, lat: locationStore.latitude, lon: locationStore.longitude)
    }

    var body: some View {
        let moon = moonData

        VStack(spacing: Theme.spacingXL) {
            DateNavigator(selectedDate: $selectedDate)

            VStack(spacing: Theme.spacingMD) {
                MoonPhaseIcon(phase: moon.phase, size: 120, tiltAngle: moon.tiltAngle)
                Text(moon.phaseName)
                    .font(.title3.weight(.medium))
                    .foregroundStyle(Theme.foreground)
                Text("\(moon.emoji) \(Int(moon.illumination))% illuminated")
                    .font(.subheadline)
                    .foregroundStyle(Theme.mutedForeground)
            }
            .frame(maxWidth: .infinity)

            VStack(spacing: 0) {
                InfoRow(icon: "moon.fill", label: "Phase", value: moon.phaseName)
                Divider().opacity(0.1)
                InfoRow(icon: "circle.lefthalf.filled", label: "Illumination", value: "\(Int(moon.illumination))%")
                Divider().opacity(0.1)
                InfoRow(icon: "calendar", label: "Age", value: String(format: "%.1f days", moon.age))
                Divider().opacity(0.1)
                InfoRow(icon: "arrow.left.and.right", label: "Distance", value: Formatting.formatDistance(moon.distance))
                Divider().opacity(0.1)
                InfoRow(icon: "mountain.2", label: "Altitude", value: Formatting.formatDegrees(moon.altitude))
                Divider().opacity(0.1)
                InfoRow(icon: "safari", label: "Azimuth", value: "\(Formatting.formatDegrees(moon.azimuth)) \(Formatting.formatAzimuthDirection(moon.azimuth))")

                if let rise = moon.moonrise {
                    Divider().opacity(0.1)
                    InfoRow(icon: "arrow.up", label: "Moonrise", value: Formatting.formatTime(rise, format: settingsStore.timeFormat))
                }
                if let set = moon.moonset {
                    Divider().opacity(0.1)
                    InfoRow(icon: "arrow.down", label: "Moonset", value: Formatting.formatTime(set, format: settingsStore.timeFormat))
                }
            }
            .surfaceCard(accent: Theme.moonAccent)
        }
    }
}
