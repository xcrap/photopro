import Foundation
import SunCalc

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

private let fullMoonThreshold: Double = 0.02

enum FullMoonFinder {
    /// Binary search for the exact moment when the moon phase is closest to 0.5.
    private static func refineToPeakFullMoon(start: Date, end: Date) -> Date {
        var lo = start.timeIntervalSince1970
        var hi = end.timeIntervalSince1970

        for _ in 0..<50 {
            let mid = (lo + hi) / 2
            let midDate = Date(timeIntervalSince1970: mid)

            let phaseMid = SunCalc.getMoonIllumination(timeAndDate: midDate).phase
            let phaseNext = SunCalc.getMoonIllumination(timeAndDate: Date(timeIntervalSince1970: mid + 1)).phase

            let distMid = abs(phaseMid - 0.5)
            let distNext = abs(phaseNext - 0.5)

            if distNext < distMid {
                lo = mid
            } else {
                hi = mid
            }

            if hi - lo < 1 { break }
        }

        return Date(timeIntervalSince1970: (lo + hi) / 2)
    }

    /// Find all full moons within a date range.
    static func findFullMoons(startDate: Date, months: Int) -> [FullMoonEvent] {
        let calendar = Calendar.current
        guard let endDate = calendar.date(byAdding: .month, value: months, to: startDate) else {
            return []
        }

        var fullMoons: [FullMoonEvent] = []
        var currentDate = startDate
        var prevPhase = SunCalc.getMoonIllumination(timeAndDate: currentDate).phase

        while currentDate < endDate {
            guard let nextDate = calendar.date(byAdding: .day, value: 1, to: currentDate) else { break }
            let currentPhase = SunCalc.getMoonIllumination(timeAndDate: nextDate).phase

            let isNearFull = abs(currentPhase - 0.5) < fullMoonThreshold
            let crossedFull = prevPhase < 0.5 && currentPhase >= 0.5

            if isNearFull || crossedFull {
                let exactDate = refineToPeakFullMoon(start: currentDate, end: nextDate)

                let daysSinceLast: Double
                if let last = fullMoons.last {
                    daysSinceLast = exactDate.timeIntervalSince(last.date) / 86400
                } else {
                    daysSinceLast = .infinity
                }

                if daysSinceLast > 20 {
                    let month = calendar.component(.month, from: exactDate)
                    let folkName = folkNames[month] ?? "Full Moon"

                    let position = SunCalc.getMoonPosition(timeAndDate: exactDate, latitude: 0, longitude: 0)

                    fullMoons.append(FullMoonEvent(
                        date: exactDate,
                        name: "Full Moon",
                        folkName: folkName,
                        isSupermoon: false,
                        distance: position.distance
                    ))
                }
            }

            prevPhase = currentPhase
            currentDate = nextDate
        }

        return fullMoons
    }
}
