import Foundation
import SunCalc

private let supermoonDistanceThreshold: Double = 362000
private let newMoonThreshold: Double = 0.02

enum SpecialEvents {
    /// Find new moons within a date range by iterating day by day.
    private static func findNewMoons(startDate: Date, months: Int) -> [Date] {
        let calendar = Calendar.current
        guard let endDate = calendar.date(byAdding: .month, value: months, to: startDate) else { return [] }

        var newMoons: [Date] = []
        var currentDate = startDate
        var prevPhase = SunCalc.getMoonIllumination(timeAndDate: currentDate).phase

        while currentDate < endDate {
            guard let nextDate = calendar.date(byAdding: .day, value: 1, to: currentDate) else { break }
            let currentPhase = SunCalc.getMoonIllumination(timeAndDate: nextDate).phase

            let isNearNew = currentPhase < newMoonThreshold || currentPhase > (1 - newMoonThreshold)
            let crossedNew = prevPhase > 0.9 && currentPhase < 0.1

            if isNearNew || crossedNew {
                let daysSinceLast: Double
                if let last = newMoons.last {
                    daysSinceLast = nextDate.timeIntervalSince(last) / 86400
                } else {
                    daysSinceLast = .infinity
                }

                if daysSinceLast > 20 {
                    newMoons.append(nextDate)
                }
            }

            prevPhase = currentPhase
            currentDate = nextDate
        }

        return newMoons
    }

    /// Detect supermoons from a list of full moon events.
    private static func findSupermoons(_ fullMoons: [FullMoonEvent]) -> [SpecialEvent] {
        fullMoons.compactMap { fullMoon in
            guard let distance = fullMoon.distance, distance < supermoonDistanceThreshold else { return nil }
            let distanceFormatted = Formatting.formatDistance(distance)
            return SpecialEvent(
                date: fullMoon.date,
                type: .supermoon,
                name: "Supermoon (\(fullMoon.folkName))",
                description: "Full moon at \(distanceFormatted) - appears ~7% larger and ~15% brighter than average"
            )
        }
    }

    /// Detect blue moons (2nd full moon in a calendar month).
    private static func findBlueMoons(_ fullMoons: [FullMoonEvent]) -> [SpecialEvent] {
        let calendar = Calendar.current
        var byMonth: [String: [FullMoonEvent]] = [:]

        for fm in fullMoons {
            let key = "\(calendar.component(.year, from: fm.date))-\(calendar.component(.month, from: fm.date))"
            byMonth[key, default: []].append(fm)
        }

        var events: [SpecialEvent] = []
        for (_, group) in byMonth {
            if group.count >= 2 {
                let sorted = group.sorted { $0.date < $1.date }
                let blueMoon = sorted[1]
                events.append(SpecialEvent(
                    date: blueMoon.date,
                    type: .blueMoon,
                    name: "Blue Moon",
                    description: "Second full moon of the month (\(blueMoon.folkName)) - a rare occurrence happening roughly every 2.7 years"
                ))
            }
        }
        return events
    }

    /// Detect black moons (2nd new moon in a calendar month).
    private static func findBlackMoons(_ newMoons: [Date]) -> [SpecialEvent] {
        let calendar = Calendar.current
        var byMonth: [String: [Date]] = [:]

        for nm in newMoons {
            let key = "\(calendar.component(.year, from: nm))-\(calendar.component(.month, from: nm))"
            byMonth[key, default: []].append(nm)
        }

        var events: [SpecialEvent] = []
        for (_, group) in byMonth {
            if group.count >= 2 {
                let sorted = group.sorted { $0 < $1 }
                let blackMoon = sorted[1]
                events.append(SpecialEvent(
                    date: blackMoon,
                    type: .blackMoon,
                    name: "Black Moon",
                    description: "Second new moon of the month - an uncommon event ideal for deep sky observation and astrophotography"
                ))
            }
        }
        return events
    }

    /// Find all special astronomical events within a date range.
    static func findSpecialEvents(startDate: Date, months: Int) -> [SpecialEvent] {
        let fullMoons = FullMoonFinder.findFullMoons(startDate: startDate, months: months)
        let newMoons = findNewMoons(startDate: startDate, months: months)

        var events: [SpecialEvent] = []
        events.append(contentsOf: findSupermoons(fullMoons))
        events.append(contentsOf: findBlueMoons(fullMoons))
        events.append(contentsOf: findBlackMoons(newMoons))
        events.sort { $0.date < $1.date }

        return events
    }
}
