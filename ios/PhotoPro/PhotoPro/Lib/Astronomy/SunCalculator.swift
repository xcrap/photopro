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
            // Photographer hours (ALGORITHM.md → "Photographer hours"):
            // blue −6° → −4°, golden −4° → +6° in the morning; mirrored in the evening.
            goldenHourStart: times.goldenHour,          // +6° setting
            goldenHourEnd: times.blueHour,              // −4° setting
            goldenHourMorningStart: times.blueHourEnd,  // −4° rising
            goldenHourMorningEnd: times.goldenHourEnd,  // +6° rising
            blueHourMorningStart: times.dawn,           // −6° rising
            blueHourMorningEnd: times.blueHourEnd,      // −4° rising
            blueHourEveningStart: times.blueHour,       // −4° setting
            blueHourEveningEnd: times.dusk,             // −6° setting
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
