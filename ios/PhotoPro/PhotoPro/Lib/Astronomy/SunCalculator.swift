import Foundation
import SunCalc

enum SunCalculator {
    /// Get comprehensive sun times for a given date and location.
    static func getSunTimes(date: Date, lat: Double, lon: Double) -> SunTimes {
        let times = SunCalc.getTimes(date: AstroDateHelper.noonUTC(for: date), latitude: lat, longitude: lon)

        // SunCalc returns optional Date? for all times — provide fallbacks
        let fallback = date
        return SunTimes(
            sunrise: times.sunrise ?? fallback,
            sunset: times.sunset ?? fallback,
            solarNoon: times.solarNoon ?? fallback,
            // Golden hour evening
            goldenHourStart: times.goldenHour ?? fallback,
            goldenHourEnd: times.sunset ?? fallback,
            // Golden hour morning
            goldenHourMorningStart: times.sunrise ?? fallback,
            goldenHourMorningEnd: times.goldenHourEnd ?? fallback,
            // Blue hour morning: nautical dawn to civil dawn
            blueHourMorningStart: times.nauticalDawn ?? fallback,
            blueHourMorningEnd: times.dawn ?? fallback,
            // Blue hour evening: civil dusk to nautical dusk
            blueHourEveningStart: times.dusk ?? fallback,
            blueHourEveningEnd: times.nauticalDusk ?? fallback,
            dawn: times.dawn ?? fallback,
            dusk: times.dusk ?? fallback,
            nauticalDawn: times.nauticalDawn ?? fallback,
            nauticalDusk: times.nauticalDusk ?? fallback,
            nightStart: times.night ?? fallback,
            nightEnd: times.nightEnd ?? fallback
        )
    }

    /// Get the sun's current position in degrees.
    static func getSunPosition(date: Date, lat: Double, lon: Double) -> SunPosition {
        let pos = SunCalc.getSunPosition(timeAndDate: date, latitude: lat, longitude: lon)

        // SunCalc returns altitude in radians, azimuth in radians from south
        let altitudeDeg = pos.altitude * 180.0 / .pi
        let azimuthDeg = ((pos.azimuth * 180.0 / .pi) + 180).truncatingRemainder(dividingBy: 360)

        return SunPosition(altitude: altitudeDeg, azimuth: azimuthDeg)
    }
}
