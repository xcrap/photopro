import Foundation
import CoreLocation
import SunCalc

/// One azimuth event for the map planner: a ray from the pin plus its panel row.
struct PlannerEvent: Identifiable, Sendable {
    enum Kind: String, Sendable {
        case sunrise, sunset, moonrise, moonset, sunNow, sunBelow, moonNow, moonBelow
    }

    var kind: Kind
    var label: String
    var time: Date?
    /// Degrees from north, clockwise.
    var azimuth: Double
    var altitude: Double?

    var id: String { kind.rawValue }
    var isMoon: Bool { [.moonrise, .moonset, .moonNow, .moonBelow].contains(kind) }
    /// Drawn dashed: a body that is below the horizon now.
    var isDashed: Bool { kind == .sunBelow || kind == .moonBelow }
    var isNow: Bool { [.sunNow, .sunBelow, .moonNow, .moonBelow].contains(kind) }
}

/// Azimuth events for the map planner: the day's sunrise/sunset and moonrise/moonset, and the
/// Sun and Moon now (today only).
enum PlannerRays {
    private static func azimuthFromNorth(_ radiansFromSouth: Double) -> Double {
        ((radiansFromSouth * 180 / .pi) + 180).truncatingRemainder(dividingBy: 360)
    }

    static func sunAzimuth(at date: Date, lat: Double, lon: Double) -> Double {
        SunCalculator.getSunPosition(date: date, lat: lat, lon: lon).azimuth
    }

    static func moonPosition(at date: Date, lat: Double, lon: Double) -> (azimuth: Double, altitude: Double) {
        let pos = SunCalc.getMoonPosition(timeAndDate: date, latitude: lat, longitude: lon)
        return (azimuthFromNorth(pos.azimuth), pos.altitude * 180 / .pi)
    }

    static func events(day: Date, now: Date, lat: Double, lon: Double, timeZone: TimeZone) -> [PlannerEvent] {
        var events: [PlannerEvent] = []

        let sun = SunCalculator.getSunTimes(date: day, lat: lat, lon: lon, timeZone: timeZone)
        if let rise = sun.sunrise {
            events.append(PlannerEvent(kind: .sunrise, label: "Sunrise", time: rise, azimuth: sunAzimuth(at: rise, lat: lat, lon: lon)))
        }
        if let set = sun.sunset {
            events.append(PlannerEvent(kind: .sunset, label: "Sunset", time: set, azimuth: sunAzimuth(at: set, lat: lat, lon: lon)))
        }

        let moon = MoonCalculator.getMoonRiseSet(date: day, lat: lat, lon: lon, timeZone: timeZone)
        if let rise = moon.rise {
            events.append(PlannerEvent(kind: .moonrise, label: "Moonrise", time: rise, azimuth: moonPosition(at: rise, lat: lat, lon: lon).azimuth))
        }
        if let set = moon.set {
            events.append(PlannerEvent(kind: .moonset, label: "Moonset", time: set, azimuth: moonPosition(at: set, lat: lat, lon: lon).azimuth))
        }

        if AstroDateHelper.isSameDay(day, now, in: timeZone) {
            let sunNow = SunCalculator.getSunPosition(date: now, lat: lat, lon: lon)
            events.append(PlannerEvent(
                kind: sunNow.altitude > -0.833 ? .sunNow : .sunBelow,
                label: sunNow.altitude > -0.833 ? "Sun now" : "Sun now (below horizon)",
                time: now, azimuth: sunNow.azimuth, altitude: sunNow.altitude
            ))
            let moonNow = moonPosition(at: now, lat: lat, lon: lon)
            events.append(PlannerEvent(
                kind: moonNow.altitude > SkyPath.horizon(.moon) ? .moonNow : .moonBelow,
                label: moonNow.altitude > SkyPath.horizon(.moon) ? "Moon now" : "Moon now (below horizon)",
                time: now, azimuth: moonNow.azimuth, altitude: moonNow.altitude
            ))
        }

        return events
    }
}
