import Foundation

enum MeteorCalculator {
    // MARK: - JSON Data Loading

    private struct MeteorShowerJSON: Codable {
        var id: String
        var name: String
        var peakSolarLongitude: Double
        var activeStartSolarLongitude: Double
        var activeEndSolarLongitude: Double
        var radiant: Radiant
        var velocity: Double
        var zhr: Int
        var rating: String
        var parentBody: String
        var description: String

        struct Radiant: Codable {
            var ra: Double
            var dec: Double
        }
    }

    private static var meteorShowersCache: [MeteorShowerJSON]?

    private static func loadMeteorShowers() -> [MeteorShowerJSON] {
        if let cache = meteorShowersCache { return cache }
        guard let url = Bundle.main.url(forResource: "meteor-showers", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([MeteorShowerJSON].self, from: data) else {
            return []
        }
        meteorShowersCache = decoded
        return decoded
    }

    // MARK: - Public API

    /// Get all meteor showers with calculated dates for a given year and location.
    static func getMeteorShowers(year: Int, userLatitude: Double) -> [MeteorShowerEvent] {
        let showers = loadMeteorShowers()

        return showers.compactMap { shower in
            let peakDate = SolarLongitude.findDateForSolarLongitude(shower.peakSolarLongitude, year: year)
            let activeStart = SolarLongitude.findDateForSolarLongitude(shower.activeStartSolarLongitude, year: year)
            var activeEnd = SolarLongitude.findDateForSolarLongitude(shower.activeEndSolarLongitude, year: year)

            if activeEnd < activeStart {
                activeEnd = SolarLongitude.findDateForSolarLongitude(shower.activeEndSolarLongitude, year: year + 1)
            }

            let maxAltitude = Visibility.getMaxAltitude(userLatitude: userLatitude, objectDeclination: shower.radiant.dec)
            let visibility = Visibility.getVisibilityRating(maxAltitude)

            guard visibility != .notVisible else { return nil }

            let now = Date()
            let isActive = now >= activeStart && now <= activeEnd

            // Calculate moon illumination at peak
            let moonIll = SunCalc.getMoonIllumination(timeAndDate: peakDate)

            return MeteorShowerEvent(
                name: shower.name,
                peakDate: peakDate,
                startDate: activeStart,
                endDate: activeEnd,
                zhr: shower.zhr,
                velocity: shower.velocity,
                parentBody: shower.parentBody,
                description: shower.description,
                moonIllumination: moonIll.fraction * 100,
                visibilityRating: visibility.label,
                isActive: isActive
            )
        }
        .sorted { $0.peakDate < $1.peakDate }
    }

    /// Get upcoming meteor showers from a given date.
    static func getUpcomingMeteorShowers(fromDate: Date, months: Int, userLatitude: Double) -> [MeteorShowerEvent] {
        let year = Calendar.current.component(.year, from: fromDate)
        let endDate = fromDate.addingTimeInterval(Double(months) * 30 * 86400)

        let thisYear = getMeteorShowers(year: year, userLatitude: userLatitude)
        let nextYear = getMeteorShowers(year: year + 1, userLatitude: userLatitude)

        return (thisYear + nextYear)
            .filter { $0.peakDate >= fromDate && $0.peakDate <= endDate }
            .sorted { $0.peakDate < $1.peakDate }
    }

    /// Get the next upcoming meteor shower.
    static func getNextMeteorShower(fromDate: Date, userLatitude: Double) -> MeteorShowerEvent? {
        let upcoming = getUpcomingMeteorShowers(fromDate: fromDate, months: 12, userLatitude: userLatitude)
        return upcoming.first
    }

    /// Get ZHR rating (1-3 stars).
    static func getZhrRating(_ zhr: Int) -> Int {
        if zhr >= 100 { return 3 }
        if zhr >= 40 { return 2 }
        return 1
    }
}

// Need to import SunCalc for moon illumination
import SunCalc
