import Foundation

enum CountdownEventType: String {
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
}

struct CountdownEvent {
    var type: CountdownEventType
    var label: String
    var time: Date
    var secondsUntil: Int
}

enum Countdown {
    /// Find the next upcoming event from sun times, moon data, and optionally meteor showers.
    static func getNextEvent(
        now: Date,
        sunTimes: SunTimes,
        moonData: MoonData,
        latitude: Double? = nil
    ) -> CountdownEvent? {
        var candidates: [(type: CountdownEventType, time: Date, label: String?)] = [
            (.blueHourAM, sunTimes.blueHourMorningStart, nil),
            (.sunrise, sunTimes.sunrise, nil),
            (.goldenHourAM, sunTimes.goldenHourMorningStart, nil),
            (.goldenHourPM, sunTimes.goldenHourStart, nil),
            (.sunset, sunTimes.sunset, nil),
            (.blueHourPM, sunTimes.blueHourEveningStart, nil),
        ]

        if let moonrise = moonData.moonrise {
            candidates.append((.moonrise, moonrise, nil))
        }
        if let moonset = moonData.moonset {
            candidates.append((.moonset, moonset, nil))
        }

        if let lat = latitude {
            if let nextMeteor = MeteorCalculator.getNextMeteorShower(fromDate: now, userLatitude: lat) {
                if nextMeteor.zhr >= 50 {
                    let daysUntil = nextMeteor.peakDate.timeIntervalSince(now) / 86400
                    if daysUntil <= 30 && daysUntil > 0 {
                        candidates.append((.meteorShower, nextMeteor.peakDate, nextMeteor.name))
                    }
                }
            }
        }

        let future = candidates
            .filter { $0.time > now }
            .sorted { $0.time < $1.time }

        guard let next = future.first else { return nil }

        let secondsUntil = Int(next.time.timeIntervalSince(now))

        return CountdownEvent(
            type: next.type,
            label: next.label ?? next.type.label,
            time: next.time,
            secondsUntil: secondsUntil
        )
    }
}
