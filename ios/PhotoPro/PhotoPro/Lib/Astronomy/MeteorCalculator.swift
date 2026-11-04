import Foundation
import SunCalc

enum MeteorCalculator {
    // MARK: - JSON Data Loading

    private struct MeteorShowerJSON: Decodable, Sendable {
        var id: String
        var name: String
        var peakSolarLongitude: Double
        var activeStartSolarLongitude: Double
        var activeEndSolarLongitude: Double
        var radiant: Radiant
        var velocity: Double
        var zhr: Int
        var rating: String?
        var parentBody: String
        var description: String

        struct Radiant: Decodable, Sendable {
            var ra: Double
            var dec: Double
        }
    }

    /// Loaded once, lazily and thread-safely (static `let`).
    private static let meteorShowers: [MeteorShowerJSON] = {
        guard let url = Bundle.main.url(forResource: "meteor-showers", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([LossyDecodable<MeteorShowerJSON>].self, from: data) else {
            return []
        }
        return decoded.compactMap(\.value)
    }()

    // MARK: - Public API

    /// Meteor showers with dates computed for `year` (activity can extend into `year + 1`).
    /// `isActive` is relative to `referenceDate`, not the wall clock.
    static func getMeteorShowers(year: Int, userLatitude: Double, referenceDate: Date = Date()) -> [MeteorShowerEvent] {
        meteorShowers.compactMap { shower in
            let peakDate = SolarLongitude.findDateForSolarLongitude(shower.peakSolarLongitude, year: year)
            let activeStart = SolarLongitude.findDateForSolarLongitude(shower.activeStartSolarLongitude, year: year)
            var activeEnd = SolarLongitude.findDateForSolarLongitude(shower.activeEndSolarLongitude, year: year)

            if activeEnd < activeStart {
                activeEnd = SolarLongitude.findDateForSolarLongitude(shower.activeEndSolarLongitude, year: year + 1)
            }

            let maxAltitude = Visibility.getMaxAltitude(userLatitude: userLatitude, objectDeclination: shower.radiant.dec)
            let visibility = Visibility.getVisibilityRating(maxAltitude)

            guard visibility != .notVisible else { return nil }

            let isActive = referenceDate >= activeStart && referenceDate <= activeEnd

            // Moon illumination at peak
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

    /// Showers peaking in `[fromDate, fromDate + months × 30 days]`, computed for years Y−1, Y, Y+1
    /// (Y = the reference date's year in the location time zone) so New-Year showers are found.
    static func getUpcomingMeteorShowers(fromDate: Date, months: Int, userLatitude: Double, timeZone: TimeZone = .current) -> [MeteorShowerEvent] {
        let year = AstroDateHelper.calendar(for: timeZone).component(.year, from: fromDate)
        let endDate = fromDate.addingTimeInterval(Double(months) * 30 * 86400)

        return ((year - 1)...(year + 1))
            .flatMap { getMeteorShowers(year: $0, userLatitude: userLatitude, referenceDate: fromDate) }
            .filter { $0.peakDate >= fromDate && $0.peakDate <= endDate }
            .sorted { $0.peakDate < $1.peakDate }
    }

    /// Get the next upcoming meteor shower.
    static func getNextMeteorShower(fromDate: Date, userLatitude: Double, timeZone: TimeZone = .current) -> MeteorShowerEvent? {
        getUpcomingMeteorShowers(fromDate: fromDate, months: 12, userLatitude: userLatitude, timeZone: timeZone).first
    }

    /// Get ZHR rating (1-3 stars).
    static func getZhrRating(_ zhr: Int) -> Int {
        if zhr >= 100 { return 3 }
        if zhr >= 40 { return 2 }
        return 1
    }
}
