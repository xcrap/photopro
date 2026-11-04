import Foundation

enum CountdownEventType: String, Sendable {
    case goldenHourAM = "golden-hour-am"
    case goldenHourPM = "golden-hour-pm"
    case blueHourAM = "blue-hour-am"
    case blueHourPM = "blue-hour-pm"
    case sunrise
    case sunset
    case moonrise
    case moonset
    case meteorShower = "meteor-shower"

    var label: String {
        switch self {
        case .goldenHourAM: return "Morning golden hour"
        case .goldenHourPM: return "Golden hour"
        case .blueHourAM: return "Morning blue hour"
        case .blueHourPM: return "Blue hour"
        case .sunrise: return "Sunrise"
        case .sunset: return "Sunset"
        case .moonrise: return "Moonrise"
        case .moonset: return "Moonset"
        case .meteorShower: return "Meteor shower"
        }
    }

    var icon: String {
        switch self {
        case .goldenHourAM, .goldenHourPM: return "camera.fill"
        case .blueHourAM, .blueHourPM: return "paintbrush.fill"
        case .sunrise: return "sunrise.fill"
        case .sunset: return "sunset.fill"
        case .moonrise: return "moonrise.fill"
        case .moonset: return "moonset.fill"
        case .meteorShower: return "sparkle"
        }
    }
}

struct CountdownEvent: Sendable {
    var type: CountdownEventType
    var label: String
    var time: Date
    var secondsUntil: Int
}

enum Countdown {
    private static let meteorMinZhr = 50
    private static let meteorMaxDays: Double = 30

    private typealias Candidate = (type: CountdownEventType, time: Date?, label: String?)

    private static func dayCandidates(sunTimes: SunTimes, moonrise: Date?, moonset: Date?) -> [Candidate] {
        [
            (.blueHourAM, sunTimes.blueHourMorningStart, nil),
            (.sunrise, sunTimes.sunrise, nil),
            (.goldenHourAM, sunTimes.goldenHourMorningStart, nil),
            (.goldenHourPM, sunTimes.goldenHourStart, nil),
            (.sunset, sunTimes.sunset, nil),
            (.blueHourPM, sunTimes.blueHourEveningStart, nil),
            (.moonrise, moonrise, nil),
            (.moonset, moonset, nil),
        ]
    }

    private static func meteorCandidate(now: Date, latitude: Double, timeZone: TimeZone) -> Candidate? {
        let shower = MeteorCalculator
            .getUpcomingMeteorShowers(fromDate: now, months: 2, userLatitude: latitude, timeZone: timeZone)
            .first { shower in
                let daysUntil = shower.peakDate.timeIntervalSince(now) / 86400
                return shower.zhr >= meteorMinZhr && daysUntil > 0 && daysUntil <= meteorMaxDays
            }
        guard let shower else { return nil }
        return (.meteorShower, shower.peakDate, shower.name)
    }

    private static func nearest(_ candidates: [Candidate], now: Date) -> CountdownEvent? {
        let future = candidates
            .compactMap { c -> (type: CountdownEventType, time: Date, label: String?)? in
                guard let time = c.time, time > now else { return nil } // absent events skipped
                return (c.type, time, c.label)
            }
            .sorted { $0.time < $1.time }

        guard let next = future.first else { return nil }
        return CountdownEvent(
            type: next.type,
            label: next.label ?? next.type.label,
            time: next.time,
            secondsUntil: Int(next.time.timeIntervalSince(now))
        )
    }

    /// Next event from one day's sun/moon data (plus an optional meteor shower).
    static func getNextEvent(
        now: Date,
        sunTimes: SunTimes,
        moonData: MoonData,
        latitude: Double? = nil,
        timeZone: TimeZone = .current
    ) -> CountdownEvent? {
        var candidates = dayCandidates(sunTimes: sunTimes, moonrise: moonData.moonrise, moonset: moonData.moonset)
        if let latitude, let meteor = meteorCandidate(now: now, latitude: latitude, timeZone: timeZone) {
            candidates.append(meteor)
        }
        return nearest(candidates, now: now)
    }

    /// Next photography event across today and tomorrow (location-local days),
    /// plus ZHR ≥ 50 meteor showers peaking within 30 days (ALGORITHM.md → "Countdown").
    static func getNextEvent(now: Date, latitude: Double, longitude: Double, timeZone: TimeZone) -> CountdownEvent? {
        var candidates: [Candidate] = []
        for dayOffset in 0...1 {
            let day = AstroDateHelper.addDays(dayOffset, to: now, in: timeZone)
            let sun = SunCalculator.getSunTimes(date: day, lat: latitude, lon: longitude, timeZone: timeZone)
            let moon = MoonCalculator.getMoonRiseSet(date: day, lat: latitude, lon: longitude, timeZone: timeZone)
            candidates.append(contentsOf: dayCandidates(sunTimes: sun, moonrise: moon.rise, moonset: moon.set))
        }
        if let meteor = meteorCandidate(now: now, latitude: latitude, timeZone: timeZone) {
            candidates.append(meteor)
        }
        return nearest(candidates, now: now)
    }
}
