import Foundation

enum SpecialEvents {
    /// Detect supermoons (Meeus distance < 362,000 km) from a list of full moon events.
    private static func findSupermoons(_ fullMoons: [FullMoonEvent]) -> [SpecialEvent] {
        fullMoons.compactMap { fullMoon in
            guard fullMoon.isSupermoon, let distance = fullMoon.distance else { return nil }
            let distanceFormatted = Formatting.formatDistance(distance)
            return SpecialEvent(
                date: fullMoon.date,
                type: .supermoon,
                name: "Supermoon (\(fullMoon.folkName))",
                description: "Full moon at \(distanceFormatted) - appears ~7% larger and ~15% brighter than average"
            )
        }
    }

    private static func monthKey(_ date: Date, _ calendar: Calendar) -> String {
        let c = calendar.dateComponents([.year, .month], from: date)
        return "\(c.year ?? 0)-\(c.month ?? 0)"
    }

    /// The second instant of each calendar month (location time zone) that has two or more.
    private static func secondInMonth(_ dates: [Date], calendar: Calendar) -> [Date] {
        var byMonth: [String: [Date]] = [:]
        for date in dates {
            byMonth[monthKey(date, calendar), default: []].append(date)
        }
        return byMonth.values.compactMap { group in
            let sorted = group.sorted()
            return sorted.count >= 2 ? sorted[1] : nil
        }
    }

    /// Detect blue moons (2nd full moon in a calendar month).
    private static func findBlueMoons(_ fullMoons: [FullMoonEvent], calendar: Calendar) -> [SpecialEvent] {
        let blueDates = Set(secondInMonth(fullMoons.map(\.date), calendar: calendar))
        return fullMoons.filter { blueDates.contains($0.date) }.map { blueMoon in
            SpecialEvent(
                date: blueMoon.date,
                type: .blueMoon,
                name: "Blue Moon",
                description: "Second full moon of the month (\(blueMoon.folkName)) - a rare occurrence happening roughly every 2.7 years"
            )
        }
    }

    /// Detect black moons (2nd new moon in a calendar month).
    private static func findBlackMoons(_ newMoons: [Date], calendar: Calendar) -> [SpecialEvent] {
        secondInMonth(newMoons, calendar: calendar).map { blackMoon in
            SpecialEvent(
                date: blackMoon,
                type: .blackMoon,
                name: "Black Moon",
                description: "Second new moon of the month - an uncommon event ideal for deep sky observation and astrophotography"
            )
        }
    }

    /// Supermoons, blue moons and black moons in `[startDate, startDate + months)`.
    /// Moons are searched from the start of the first local month so a month's first
    /// full/new moon counts even when it falls before `startDate`.
    static func findSpecialEvents(startDate: Date, months: Int, timeZone: TimeZone) -> [SpecialEvent] {
        let calendar = AstroDateHelper.calendar(for: timeZone)
        guard let endDate = calendar.date(byAdding: .month, value: months, to: startDate) else { return [] }
        let monthStart = calendar.dateInterval(of: .month, for: startDate)?.start ?? startDate

        let fullMoons = FullMoonFinder.findFullMoons(from: monthStart, to: endDate, timeZone: timeZone)
        let newMoons = MoonEphemeris.findPhaseInstants(start: monthStart, end: endDate, target: .new)

        var events: [SpecialEvent] = []
        events.append(contentsOf: findSupermoons(fullMoons))
        events.append(contentsOf: findBlueMoons(fullMoons, calendar: calendar))
        events.append(contentsOf: findBlackMoons(newMoons, calendar: calendar))

        return events
            .filter { $0.date >= startDate }
            .sorted { $0.date < $1.date }
    }
}
