import Foundation
import SunCalc

enum EclipseCalculator {
    // MARK: - JSON Data Loading

    private struct SaoMiguelOverrides: Codable {
        var location: LocationBounds
        var solar: [String: Double]
        var lunar: [String: Double]

        struct LocationBounds: Codable {
            var name: String
            var bounds: EclipseBounds
        }
    }

    private static var overridesCache: SaoMiguelOverrides?

    private static func loadOverrides() -> SaoMiguelOverrides? {
        if let cache = overridesCache { return cache }
        guard let url = Bundle.main.url(forResource: "azores-sao-miguel-eclipse-overrides", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode(SaoMiguelOverrides.self, from: data) else {
            return nil
        }
        overridesCache = decoded
        return decoded
    }

    static func loadSolarEclipses() -> [EclipseEvent] {
        guard let url = Bundle.main.url(forResource: "solar-eclipses", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return [] }
        return (try? JSONDecoder().decode([EclipseEvent].self, from: data)) ?? []
    }

    static func loadLunarEclipses() -> [EclipseEvent] {
        guard let url = Bundle.main.url(forResource: "lunar-eclipses", withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return [] }
        return (try? JSONDecoder().decode([EclipseEvent].self, from: data)) ?? []
    }

    // MARK: - Bounds Checking

    private static func isWithinBounds(lat: Double, lon: Double, bounds: EclipseBounds) -> Bool {
        let withinLat = lat >= bounds.latMin && lat <= bounds.latMax
        let withinLon: Bool
        if bounds.lonMin <= bounds.lonMax {
            withinLon = lon >= bounds.lonMin && lon <= bounds.lonMax
        } else {
            withinLon = lon >= bounds.lonMin || lon <= bounds.lonMax
        }
        return withinLat && withinLon
    }

    // MARK: - Duration Parsing

    private static func parseDurationToMinutes(_ duration: String) -> Double {
        let hourPattern = try? NSRegularExpression(pattern: #"(\d+)\s*h"#)
        let minPattern = try? NSRegularExpression(pattern: #"(\d+)\s*m"#)
        let secPattern = try? NSRegularExpression(pattern: #"(\d+)\s*s"#)

        let range = NSRange(duration.startIndex..., in: duration)

        let hours = hourPattern?.firstMatch(in: duration, range: range)
            .flatMap { Range($0.range(at: 1), in: duration) }
            .flatMap { Double(duration[$0]) } ?? 0

        let minutes = minPattern?.firstMatch(in: duration, range: range)
            .flatMap { Range($0.range(at: 1), in: duration) }
            .flatMap { Double(duration[$0]) } ?? 0

        let seconds = secPattern?.firstMatch(in: duration, range: range)
            .flatMap { Range($0.range(at: 1), in: duration) }
            .flatMap { Double(duration[$0]) } ?? 0

        return (hours * 60) + minutes + (seconds / 60)
    }

    // MARK: - Sao Miguel Override

    private static func getSaoMiguelPreciseOverride(_ eclipse: EclipseEvent, lat: Double, lon: Double) -> Double? {
        guard let overrides = loadOverrides(),
              isWithinBounds(lat: lat, lon: lon, bounds: overrides.location.bounds) else {
            return nil
        }

        let dateKey = eclipse.dateString
        if eclipse.category == .solar {
            return overrides.solar[dateKey]
        } else if eclipse.category == .lunar {
            return overrides.lunar[dateKey]
        }
        return nil
    }

    // MARK: - Local Lunar Visibility

    private static func getLocalLunarVisibility(_ eclipse: EclipseEvent, lat: Double, lon: Double) -> Double {
        let durationMinutes = max(parseDurationToMinutes(eclipse.duration), 1)
        let halfDurationMs = (durationMinutes * 60) / 2
        let eclipseTime = eclipse.date.timeIntervalSince1970
        let startMs = eclipseTime - halfDurationMs
        let endMs = eclipseTime + halfDurationMs
        let stepMs: Double = 5 * 60

        var totalSamples = 0
        var visibleSamples = 0
        var t = startMs

        while t <= endMs {
            let moonPos = SunCalc.getMoonPosition(
                timeAndDate: Date(timeIntervalSince1970: t),
                latitude: lat,
                longitude: lon
            )
            totalSamples += 1
            if moonPos.altitude > 0 {
                visibleSamples += 1
            }
            t += stepMs
        }

        guard totalSamples > 0 else { return 0 }
        return (Double(visibleSamples) / Double(totalSamples) * 100).rounded()
    }

    // MARK: - Public API

    /// Check visibility for a location. Returns percentage (0-100).
    static func getVisibilityForLocation(_ eclipse: EclipseEvent, lat: Double, lon: Double) -> Double {
        let overrideVisibility = getSaoMiguelPreciseOverride(eclipse, lat: lat, lon: lon)
        var bestVisibility = overrideVisibility ?? 0

        for region in eclipse.visibility {
            if isWithinBounds(lat: lat, lon: lon, bounds: region.bounds) {
                bestVisibility = max(bestVisibility, region.percentage)
            }
        }

        if eclipse.category == .lunar {
            bestVisibility = max(bestVisibility, getLocalLunarVisibility(eclipse, lat: lat, lon: lon))
        }

        return bestVisibility
    }

    /// Get upcoming eclipses within a year range.
    static func getUpcomingEclipses(lunarData: [EclipseEvent], solarData: [EclipseEvent], yearsRange: Int) -> [EclipseEvent] {
        let now = Date()
        let calendar = Calendar.current
        guard let endDate = calendar.date(byAdding: .year, value: yearsRange, to: now) else { return [] }

        var allEclipses = lunarData + solarData
        allEclipses = allEclipses.filter { eclipse in
            eclipse.date >= now && eclipse.date <= endDate
        }
        allEclipses.sort { $0.date < $1.date }
        return allEclipses
    }
}
