import Foundation
import SunCalc

enum SunCalculator {
    /// Sun times for the local day (location time zone) containing `date`.
    /// SunCalc is called at 12:00 local time; absent (polar) events stay `nil`.
    static func getSunTimes(date: Date, lat: Double, lon: Double, timeZone: TimeZone) -> SunTimes {
        let times = SunCalc.getTimes(
            date: AstroDateHelper.localNoon(for: date, in: timeZone),
            latitude: lat,
            longitude: lon
        )

        var polarState = PolarState.none
        if times.sunrise == nil || times.sunset == nil, let noon = times.solarNoon {
            let noonAltitude = getSunPosition(date: noon, lat: lat, lon: lon).altitude
            if times.sunset == nil && noonAltitude > 0 {
                polarState = .alwaysUp
            } else if times.sunrise == nil && noonAltitude < 0 {
                polarState = .alwaysDown
            }
        }

        return SunTimes(
            sunrise: times.sunrise,
            sunset: times.sunset,
            solarNoon: times.solarNoon,
            // Golden hour evening: sun at 6° → sunset
            goldenHourStart: times.goldenHour,
            goldenHourEnd: times.sunset,
            // Golden hour morning: sunrise → sun at 6°
            goldenHourMorningStart: times.sunrise,
            goldenHourMorningEnd: times.goldenHourEnd,
            // Blue hour morning: nautical dawn → civil dawn
            blueHourMorningStart: times.nauticalDawn,
            blueHourMorningEnd: times.dawn,
            // Blue hour evening: civil dusk → nautical dusk
            blueHourEveningStart: times.dusk,
            blueHourEveningEnd: times.nauticalDusk,
            dawn: times.dawn,
            dusk: times.dusk,
            nauticalDawn: times.nauticalDawn,
            nauticalDusk: times.nauticalDusk,
            nightStart: times.night,
            nightEnd: times.nightEnd,
            polarState: polarState
        )
    }

    /// Get the sun's position in degrees (azimuth from north, clockwise).
    static func getSunPosition(date: Date, lat: Double, lon: Double) -> SunPosition {
        let pos = SunCalc.getSunPosition(timeAndDate: date, latitude: lat, longitude: lon)

        // SunCalc returns altitude in radians, azimuth in radians from south
        let altitudeDeg = pos.altitude * 180.0 / .pi
        let azimuthDeg = ((pos.azimuth * 180.0 / .pi) + 180).truncatingRemainder(dividingBy: 360)

        return SunPosition(altitude: altitudeDeg, azimuth: azimuthDeg)
    }
}
