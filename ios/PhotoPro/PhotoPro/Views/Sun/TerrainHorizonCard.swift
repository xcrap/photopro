import SwiftUI

/// Colours shared by the map rays, the legend and the terrain rows.
enum PlannerColors {
    static let sunrise = Color(red: 0.94, green: 0.64, blue: 0.01)   // #f0a202
    static let sunset = Color(red: 0.89, green: 0.32, blue: 0.17)    // #e2522b
    static let sunNow = Color(red: 1.0, green: 0.82, blue: 0.25)     // #ffd23f
    static let sunBelow = Color(red: 0.45, green: 0.55, blue: 0.78)
    static let moonrise = Color(red: 0.49, green: 0.83, blue: 0.99)  // #7dd3fc
    static let moonset = Color(red: 0.65, green: 0.55, blue: 0.98)   // #a78bfa
    static let moonNow = Color(red: 0.95, green: 0.96, blue: 0.98)   // #f1f5f9
    static let moonBelow = Color(red: 0.58, green: 0.64, blue: 0.72) // #94a3b8
    static let sunPath = Color(red: 0.98, green: 0.80, blue: 0.08)   // #facc15
    static let moonPath = Color(red: 0.66, green: 0.72, blue: 0.85)  // #a8b8d8
    static let sunDisc = Color(red: 0.96, green: 0.62, blue: 0.04)   // #f59e0b
    static let moonDisc = Color(red: 0.89, green: 0.91, blue: 0.94)  // #e2e8f0

    static func color(for kind: PlannerEvent.Kind) -> Color {
        switch kind {
        case .sunrise: return sunrise
        case .sunset: return sunset
        case .sunNow: return sunNow
        case .sunBelow: return sunBelow
        case .moonrise: return moonrise
        case .moonset: return moonset
        case .moonNow: return moonNow
        case .moonBelow: return moonBelow
        }
    }
}

/// Real first/last light over the terrain skyline for one local day.
struct TerrainLightSummary {
    let sun: TerrainHorizon.Light
    let moon: TerrainHorizon.Light
    let sunTimes: SunTimes
    let riseSkyline: (angle: Double, distance: Double, sea: Bool)?
    let setSkyline: (angle: Double, distance: Double, sea: Bool)?

    init(profile: HorizonProfile, day: Date, timeZone: TimeZone) {
        let lat = profile.latitude, lon = profile.longitude
        sun = TerrainHorizon.light(.sun, on: day, profile: profile, timeZone: timeZone)
        moon = TerrainHorizon.light(.moon, on: day, profile: profile, timeZone: timeZone)
        sunTimes = SunCalculator.getSunTimes(date: day, lat: lat, lon: lon, timeZone: timeZone)
        func skyline(_ time: Date?) -> (Double, Double, Bool)? {
            guard let time else { return nil }
            let az = PlannerRays.sunAzimuth(at: time, lat: lat, lon: lon)
            return (profile.skyline(atAzimuth: az), profile.skylineDistance(atAzimuth: az), profile.skylineIsSea(atAzimuth: az))
        }
        riseSkyline = skyline(sunTimes.sunrise)
        setSkyline = skyline(sunTimes.sunset)
    }

    /// Minutes first light comes after sunrise (negative: before).
    var riseDelayMinutes: Int? {
        guard let first = sun.first, let rise = sunTimes.sunrise else { return nil }
        return Int((first.timeIntervalSince(rise) / 60).rounded())
    }

    /// Minutes last light comes before sunset (negative: after).
    var setLeadMinutes: Int? {
        guard let last = sun.last, let set = sunTimes.sunset else { return nil }
        return Int((set.timeIntervalSince(last) / 60).rounded())
    }
}

/// Rows for the terrain first/last light, shared by the Sun tab card and the map planner.
struct TerrainLightRows: View {
    enum Part { case sun, moon }

    let summary: TerrainLightSummary
    let timeZone: TimeZone
    let timeFormat: TimeFormat
    var parts: Set<Part> = [.sun, .moon]

    private func time(_ date: Date?) -> String {
        Formatting.formatTime(date, format: timeFormat, timeZone: timeZone)
    }

    private func skylineText(_ skyline: (angle: Double, distance: Double, sea: Bool)?) -> String? {
        guard let skyline else { return nil }
        let where_ = skyline.sea ? "sea horizon" : String(format: "%.1f km away", skyline.distance / 1000)
        return String(format: "Skyline %.1f° · ", skyline.angle) + where_
    }

    var body: some View {
        VStack(spacing: 0) {
            if parts.contains(.sun) {
                if summary.sun.first == nil && summary.sun.last == nil {
                    InfoRow(icon: "mountain.2", label: "Direct sunlight", value: "—",
                            sublabel: "The Sun doesn't clear the terrain this day")
                } else {
                    InfoRow(icon: "sunrise", label: "First direct sun", value: time(summary.sun.first),
                            sublabel: delayText(summary.riseDelayMinutes, suffix: "sunrise", after: true)
                                .map { [$0, skylineText(summary.riseSkyline)].compactMap { $0 }.joined(separator: " · ") })
                    Divider().opacity(0.1)
                    InfoRow(icon: "sunset", label: "Last direct sun", value: time(summary.sun.last),
                            sublabel: delayText(summary.setLeadMinutes, suffix: "sunset", after: false)
                                .map { [$0, skylineText(summary.setSkyline)].compactMap { $0 }.joined(separator: " · ") })
                }
            }
            if parts == [.sun, .moon] {
                Divider().opacity(0.1)
            }
            if parts.contains(.moon) {
                InfoRow(icon: "moonrise", label: "Moon clears the terrain", value: time(summary.moon.first))
                Divider().opacity(0.1)
                InfoRow(icon: "moonset", label: "Moon drops behind the terrain", value: time(summary.moon.last))
            }
        }
    }

    private func delayText(_ minutes: Int?, suffix: String, after: Bool) -> String? {
        guard let minutes else { return nil }
        if minutes == 0 { return "Same as \(suffix)" }
        let later = after ? minutes > 0 : minutes < 0
        return "\(abs(minutes)) min \(later ? "after" : "before") \(suffix)"
    }
}

/// "Real horizon" card for the Sun tab: when direct light actually reaches the spot.
struct TerrainHorizonCard: View {
    let date: Date

    @Environment(LocationStore.self) private var locationStore
    @Environment(SettingsStore.self) private var settingsStore
    @Environment(HorizonStore.self) private var horizonStore

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Label("Real Horizon", systemImage: "mountain.2.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.sunAccent)
                .padding(.bottom, Theme.spacingMD)

            switch horizonStore.state(for: locationStore.coordinateKey) {
            case .idle, .loading:
                HStack(spacing: Theme.spacingSM) {
                    ProgressView()
                    Text("Reading terrain…")
                        .font(.caption)
                        .foregroundStyle(Theme.mutedForeground)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, Theme.spacingSM)
            case .failed:
                Text("Elevation data is unavailable right now.")
                    .font(.caption)
                    .foregroundStyle(Theme.mutedForeground)
            case .loaded(let profile):
                let timeZone = locationStore.timeZone
                TerrainLightRows(
                    summary: TerrainLightSummary(profile: profile, day: date, timeZone: timeZone),
                    timeZone: timeZone,
                    timeFormat: settingsStore.timeFormat,
                    parts: [.sun]
                )
                Text("Ground \(Int(profile.elevation.rounded())) m. Terrain only: trees and buildings aren't in the elevation data.")
                    .font(.caption2)
                    .foregroundStyle(Theme.mutedForeground)
                    .padding(.top, Theme.spacingSM)
            }
        }
        .surfaceCard(accent: Theme.sunAccent)
        .task(id: locationStore.coordinateKey) {
            await horizonStore.load(latitude: locationStore.latitude, longitude: locationStore.longitude)
        }
    }
}
