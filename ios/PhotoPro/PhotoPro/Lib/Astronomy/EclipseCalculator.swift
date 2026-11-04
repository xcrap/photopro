import Foundation
import SunCalc

enum EclipseCalculator {
    // MARK: - JSON Data Loading

    private struct SaoMiguelOverrides: Decodable, Sendable {
        var location: LocationBounds
        var solar: [String: Double]
        var lunar: [String: Double]

        struct LocationBounds: Decodable, Sendable {
            var name: String
            var bounds: EclipseBounds
        }
    }

    private static func loadJSON<T: Decodable>(_ resource: String, as type: T.Type) -> T? {
        guard let url = Bundle.main.url(forResource: resource, withExtension: "json"),
              let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    /// Loaded once, lazily and thread-safely (static `let`s).
    private static let overrides: SaoMiguelOverrides? =
        loadJSON("azores-sao-miguel-eclipse-overrides", as: SaoMiguelOverrides.self)

    private static let solarEclipses: [EclipseEvent] =
        (loadJSON("solar-eclipses", as: [LossyDecodable<EclipseEvent>].self) ?? []).compactMap(\.value)

    private static let lunarEclipses: [EclipseEvent] =
        (loadJSON("lunar-eclipses", as: [LossyDecodable<EclipseEvent>].self) ?? []).compactMap(\.value)

    static func loadSolarEclipses() -> [EclipseEvent] { solarEclipses }

    static func loadLunarEclipses() -> [EclipseEvent] { lunarEclipses }

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
        func component(_ unit: String) -> Double {
            guard let range = duration.range(of: #"(\d+)\s*"# + unit, options: .regularExpression) else { return 0 }
            let digits = duration[range].prefix { $0.isNumber }
            return Double(digits) ?? 0
        }
        return component("h") * 60 + component("m") + component("s") / 60
    }

    // MARK: - Sao Miguel Override

    /// Override key: the eclipse instant in ISO 8601 with milliseconds ("2026-08-12T17:46:00.000Z").
    static func overrideKey(for eclipse: EclipseEvent) -> String {
        ISODate.stringWithMilliseconds(eclipse.date)
    }

    private static func getSaoMiguelPreciseOverride(_ eclipse: EclipseEvent, lat: Double, lon: Double) -> Double? {
        guard let overrides,
              isWithinBounds(lat: lat, lon: lon, bounds: overrides.location.bounds) else {
            return nil
        }

        let key = overrideKey(for: eclipse)
        switch eclipse.category {
        case .solar: return overrides.solar[key]
        case .lunar: return overrides.lunar[key]
        }
    }

    // MARK: - Local Lunar Visibility

    /// Percentage of 5-minute samples across the eclipse duration (centred on the peak)
    /// with the moon above the horizon.
    private static func getLocalLunarVisibility(_ eclipse: EclipseEvent, lat: Double, lon: Double) -> Double {
        let durationMinutes = max(parseDurationToMinutes(eclipse.duration), 1)
        let halfDuration = (durationMinutes * 60) / 2
        let eclipseTime = eclipse.date.timeIntervalSince1970
        let start = eclipseTime - halfDuration
        let end = eclipseTime + halfDuration
        let step: Double = 5 * 60

        var totalSamples = 0
        var visibleSamples = 0
        var t = start

        while t <= end {
            let moonPos = SunCalc.getMoonPosition(
                timeAndDate: Date(timeIntervalSince1970: t),
                latitude: lat,
                longitude: lon
            )
            totalSamples += 1
            if moonPos.altitude > 0 {
                visibleSamples += 1
            }
            t += step
        }

        guard totalSamples > 0 else { return 0 }
        return (Double(visibleSamples) / Double(totalSamples) * 100).rounded()
    }

    // MARK: - Public API

    /// Visibility percentage (0-100) for a location (ALGORITHM.md → "Eclipse Visibility").
    /// - Solar: Azores override, else the best matching region box.
    /// - Lunar: Azores override, else moon-altitude sampling (region boxes are not used).
    static func getVisibilityForLocation(_ eclipse: EclipseEvent, lat: Double, lon: Double) -> Double {
        if let override = getSaoMiguelPreciseOverride(eclipse, lat: lat, lon: lon) {
            return override
        }

        switch eclipse.category {
        case .solar:
            return eclipse.visibility
                .filter { isWithinBounds(lat: lat, lon: lon, bounds: $0.bounds) }
                .map(\.percentage)
                .max() ?? 0
        case .lunar:
            return getLocalLunarVisibility(eclipse, lat: lat, lon: lon)
        }
    }

    /// Get upcoming eclipses within a year range.
    static func getUpcomingEclipses(lunarData: [EclipseEvent], solarData: [EclipseEvent], yearsRange: Int, now: Date = Date()) -> [EclipseEvent] {
        guard let endDate = AstroDateHelper.utcCalendar.date(byAdding: .year, value: yearsRange, to: now) else { return [] }

        return (lunarData + solarData)
            .filter { $0.date >= now && $0.date <= endDate }
            .sorted { $0.date < $1.date }
    }
}
