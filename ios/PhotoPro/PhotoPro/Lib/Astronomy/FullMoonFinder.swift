import Foundation

private let folkNames: [Int: String] = [
    1: "Wolf Moon",
    2: "Snow Moon",
    3: "Worm Moon",
    4: "Pink Moon",
    5: "Flower Moon",
    6: "Strawberry Moon",
    7: "Buck Moon",
    8: "Sturgeon Moon",
    9: "Harvest Moon",
    10: "Hunter's Moon",
    11: "Beaver Moon",
    12: "Cold Moon",
]

enum FullMoonFinder {
    /// Full moons in `[startDate, startDate + months)`, found by elongation crossing + bisection
    /// (ALGORITHM.md → "Full & New Moon Detection"). Folk names use the location-local month.
    static func findFullMoons(startDate: Date, months: Int, timeZone: TimeZone) -> [FullMoonEvent] {
        let calendar = AstroDateHelper.calendar(for: timeZone)
        guard let endDate = calendar.date(byAdding: .month, value: months, to: startDate) else {
            return []
        }
        return findFullMoons(from: startDate, to: endDate, timeZone: timeZone)
    }

    /// Full moons in `[start, end)`.
    static func findFullMoons(from start: Date, to end: Date, timeZone: TimeZone) -> [FullMoonEvent] {
        let calendar = AstroDateHelper.calendar(for: timeZone)
        return MoonEphemeris.findPhaseInstants(start: start, end: end, target: .full).map { instant in
            let month = calendar.component(.month, from: instant)
            let distance = MoonEphemeris.distanceKm(at: instant)
            return FullMoonEvent(
                date: instant,
                name: "Full Moon",
                folkName: folkNames[month] ?? "Full Moon",
                isSupermoon: distance < MoonEphemeris.supermoonDistanceKm,
                distance: distance
            )
        }
    }
}
