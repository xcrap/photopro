import Foundation
import SunCalc

private let synodicMonth: Double = 29.53059

enum MoonCalculator {
    /// Map a phase value (0-1) to a human-readable phase name.
    static func getPhaseName(_ phase: Double) -> String {
        if phase < 0.025 || phase >= 0.975 { return "New Moon" }
        if phase < 0.225 { return "Waxing Crescent" }
        if phase < 0.275 { return "First Quarter" }
        if phase < 0.475 { return "Waxing Gibbous" }
        if phase < 0.525 { return "Full Moon" }
        if phase < 0.725 { return "Waning Gibbous" }
        if phase < 0.775 { return "Last Quarter" }
        return "Waning Crescent"
    }

    /// Map a phase value (0-1) to a moon phase emoji.
    static func getPhaseEmoji(_ phase: Double) -> String {
        if phase < 0.025 || phase >= 0.975 { return "\u{1F311}" }
        if phase < 0.225 { return "\u{1F312}" }
        if phase < 0.275 { return "\u{1F313}" }
        if phase < 0.475 { return "\u{1F314}" }
        if phase < 0.525 { return "\u{1F315}" }
        if phase < 0.725 { return "\u{1F316}" }
        if phase < 0.775 { return "\u{1F317}" }
        return "\u{1F318}"
    }

    /// Moonrise/moonset during the local day (location time zone) containing `date`.
    static func getMoonRiseSet(date: Date, lat: Double, lon: Double, timeZone: TimeZone) -> (rise: Date?, set: Date?) {
        let times = SunCalc.getMoonTimes(
            date: AstroDateHelper.localMidnight(for: date, in: timeZone),
            latitude: lat,
            longitude: lon
        )
        return (times.rise, times.set)
    }

    /// Get comprehensive moon data for a given instant and location.
    /// Rise/set are for the local day containing `date`; distance comes from the Meeus ephemeris.
    static func getMoonData(date: Date, lat: Double, lon: Double, timeZone: TimeZone) -> MoonData {
        let illumination = SunCalc.getMoonIllumination(timeAndDate: date)
        let position = SunCalc.getMoonPosition(timeAndDate: date, latitude: lat, longitude: lon)
        let riseSet = getMoonRiseSet(date: date, lat: lat, lon: lon, timeZone: timeZone)

        let phase = illumination.phase
        let fraction = illumination.fraction

        // Convert from radians to degrees, azimuth from south to from north
        let altitudeDeg = position.altitude * 180.0 / .pi
        let azimuthDeg = ((position.azimuth * 180.0 / .pi) + 180)
            .truncatingRemainder(dividingBy: 360)

        let age = phase * synodicMonth

        // Bright limb tilt as seen by the observer: illumination angle (from celestial north)
        // minus the parallactic angle (zenith → celestial north). Same as the web app.
        let isWaxing = phase <= 0.5
        let zenithAngleDeg = (illumination.angle - position.parallacticAngle) * 180.0 / .pi
        let tiltAngle = -zenithAngleDeg + (isWaxing ? -90 : 90)

        return MoonData(
            phase: phase,
            phaseName: getPhaseName(phase),
            illumination: fraction * 100,
            age: age,
            distance: MoonEphemeris.distanceKm(at: date),
            emoji: getPhaseEmoji(phase),
            altitude: altitudeDeg,
            azimuth: azimuthDeg,
            tiltAngle: tiltAngle,
            moonrise: riseSet.rise,
            moonset: riseSet.set
        )
    }

    /// Moon illumination percentage (SunCalc fraction × 100) at an instant.
    static func illuminationPercent(at date: Date) -> Double {
        SunCalc.getMoonIllumination(timeAndDate: date).fraction * 100
    }
}
