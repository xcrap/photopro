import SwiftUI

struct MoonCurrentTab: View {
    @Binding var selectedDate: Date
    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore

    private var moonData: MoonData {
        MoonCalculator.getMoonData(
            date: selectedDate, lat: locationStore.latitude, lon: locationStore.longitude, timeZone: locationStore.timeZone
        )
    }

    var body: some View {
        let moon = moonData

        VStack(spacing: Theme.spacingXL) {
            DateNavigator(selectedDate: $selectedDate)

            VStack(spacing: Theme.spacingMD) {
                MoonPhaseIcon(phase: moon.phase, size: 120, tiltAngle: moon.tiltAngle)
                    .accessibilityHidden(true)
                Text(moon.phaseName)
                    .font(.title3.weight(.medium))
                    .foregroundStyle(Theme.foreground)
                Text("\(moon.emoji) \(Int(moon.illumination.rounded()))% illuminated")
                    .font(.subheadline)
                    .foregroundStyle(Theme.mutedForeground)
            }
            .frame(maxWidth: .infinity)

            VStack(spacing: 0) {
                InfoRow(icon: "moon.fill", label: "Phase", value: moon.phaseName)
                Divider().opacity(0.1)
                InfoRow(icon: "circle.lefthalf.filled", label: "Illumination", value: "\(Int(moon.illumination.rounded()))%")
                Divider().opacity(0.1)
                InfoRow(icon: "calendar", label: "Age", value: String(format: "%.1f days", moon.age))
                Divider().opacity(0.1)
                InfoRow(icon: "arrow.left.and.right", label: "Distance", value: Formatting.formatDistance(moon.distance),
                        sublabel: moon.distance < MoonEphemeris.supermoonDistanceKm ? "Supermoon distance" : nil)
                Divider().opacity(0.1)
                InfoRow(icon: "mountain.2", label: "Altitude", value: Formatting.formatDegrees(moon.altitude))
                Divider().opacity(0.1)
                InfoRow(icon: "safari", label: "Azimuth", value: "\(Formatting.formatDegrees(moon.azimuth)) \(Formatting.formatAzimuthDirection(moon.azimuth))")

                Divider().opacity(0.1)
                InfoRow(icon: "arrow.up", label: "Moonrise",
                        value: Formatting.formatTime(moon.moonrise, format: settingsStore.timeFormat, timeZone: locationStore.timeZone),
                        sublabel: moon.moonrise == nil ? "No moonrise this day" : nil)
                Divider().opacity(0.1)
                InfoRow(icon: "arrow.down", label: "Moonset",
                        value: Formatting.formatTime(moon.moonset, format: settingsStore.timeFormat, timeZone: locationStore.timeZone),
                        sublabel: moon.moonset == nil ? "No moonset this day" : nil)
            }
            .surfaceCard(accent: Theme.moonAccent)
        }
    }
}
