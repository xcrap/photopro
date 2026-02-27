import SwiftUI

struct SunCurrentTab: View {
    @Binding var selectedDate: Date
    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore

    private var sunTimes: SunTimes {
        SunCalculator.getSunTimes(date: selectedDate, lat: locationStore.latitude, lon: locationStore.longitude)
    }

    private var sunPosition: SunPosition {
        SunCalculator.getSunPosition(date: selectedDate, lat: locationStore.latitude, lon: locationStore.longitude)
    }

    var body: some View {
        let times = sunTimes

        VStack(spacing: Theme.spacingXL) {
            DateNavigator(selectedDate: $selectedDate)

            // Day Times
            VStack(alignment: .leading, spacing: 0) {
                Label("Day Times", systemImage: "sun.max.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.sunAccent)
                    .padding(.bottom, Theme.spacingLG)

                InfoRow(icon: "sunrise", label: "Sunrise", value: fmt(times.sunrise))
                Divider().opacity(0.1)
                InfoRow(icon: "sun.max", label: "Solar Noon", value: fmt(times.solarNoon))
                Divider().opacity(0.1)
                InfoRow(icon: "sunset", label: "Sunset", value: fmt(times.sunset))
            }
            .surfaceCard(accent: Theme.sunAccent)

            // Photography Hours
            VStack(alignment: .leading, spacing: 0) {
                Label("Photography Hours", systemImage: "camera.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.sunAccent)
                    .padding(.bottom, Theme.spacingLG)

                InfoRow(icon: "paintbrush", label: "Morning Blue Hour",
                        value: "\(fmt(times.blueHourMorningStart)) – \(fmt(times.blueHourMorningEnd))")
                Divider().opacity(0.1)
                InfoRow(icon: "sparkles", label: "Morning Golden Hour",
                        value: "\(fmt(times.goldenHourMorningStart)) – \(fmt(times.goldenHourMorningEnd))")
                Divider().opacity(0.1)
                InfoRow(icon: "sparkles", label: "Evening Golden Hour",
                        value: "\(fmt(times.goldenHourStart)) – \(fmt(times.goldenHourEnd))")
                Divider().opacity(0.1)
                InfoRow(icon: "paintbrush", label: "Evening Blue Hour",
                        value: "\(fmt(times.blueHourEveningStart)) – \(fmt(times.blueHourEveningEnd))")
            }
            .surfaceCard(accent: Theme.sunAccent)

            // Twilight
            VStack(alignment: .leading, spacing: 0) {
                Label("Twilight", systemImage: "sun.haze")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.mutedForeground)
                    .padding(.bottom, Theme.spacingLG)

                InfoRow(icon: "sun.horizon", label: "Dawn", value: fmt(times.dawn))
                Divider().opacity(0.1)
                InfoRow(icon: "sun.horizon", label: "Dusk", value: fmt(times.dusk))
                Divider().opacity(0.1)
                InfoRow(icon: "moon.haze", label: "Nautical Dawn", value: fmt(times.nauticalDawn))
                Divider().opacity(0.1)
                InfoRow(icon: "moon.haze", label: "Nautical Dusk", value: fmt(times.nauticalDusk))
                Divider().opacity(0.1)
                InfoRow(icon: "moon.stars", label: "Night Start", value: fmt(times.nightStart))
                Divider().opacity(0.1)
                InfoRow(icon: "moon.stars", label: "Night End", value: fmt(times.nightEnd))
            }
            .surfaceCard()
        }
    }

    private func fmt(_ date: Date) -> String {
        Formatting.formatTime(date, format: settingsStore.timeFormat)
    }
}
