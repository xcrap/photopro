import Foundation
import SunCalc

private let maxTimeDiffMinutes: Double = 30
private let maxAzimuthDeviationDegrees: Double = 30
private let minMoonIlluminationPercent: Double = 5

enum ProximityFinder {
    /// Circular azimuth difference: `min(|a − b|, 360 − |a − b|)`.
    static func circularDifference(_ a: Double, _ b: Double) -> Double {
        var diff = abs(a - b).truncatingRemainder(dividingBy: 360)
        if diff > 180 { diff = 360 - diff }
        return diff
    }

    private static func azimuthFromNorth(_ radiansFromSouth: Double) -> Double {
        ((radiansFromSouth * 180 / .pi) + 180).truncatingRemainder(dividingBy: 360)
    }

    /// Moon/Sun rise-set pairs within 30 min whose moon is beside the Sun (same-event pairs) or
    /// opposite it (cross pairs) within 30°, with the moon at least 5% illuminated
    /// (ALGORITHM.md → "Proximity Finder"). Days are location-local days.
    static func findProximityEvents(startDate: Date, days: Int, lat: Double, lon: Double, timeZone: TimeZone) -> [ProximityEvent] {
        var events: [ProximityEvent] = []
        let firstDay = AstroDateHelper.localMidnight(for: startDate, in: timeZone)

        for i in 0..<max(0, days) {
            let dayStart = AstroDateHelper.addDays(i, to: firstDay, in: timeZone)
            let sunTimes = SunCalc.getTimes(
                date: AstroDateHelper.localNoon(for: dayStart, in: timeZone),
                latitude: lat,
                longitude: lon
            )
            let moonTimes = SunCalc.getMoonTimes(date: dayStart, latitude: lat, longitude: lon)

            var pairs: [(moonTime: Date, sunTime: Date, type: ProximityType)] = []
            if let mr = moonTimes.rise {
                if let sr = sunTimes.sunrise { pairs.append((mr, sr, .moonriseSunrise)) }
                if let ss = sunTimes.sunset { pairs.append((mr, ss, .moonriseSunset)) }
            }
            if let ms = moonTimes.set {
                if let sr = sunTimes.sunrise { pairs.append((ms, sr, .moonsetSunrise)) }
                if let ss = sunTimes.sunset { pairs.append((ms, ss, .moonsetSunset)) }
            }

            for pair in pairs {
                let timeDiffMinutes = abs(pair.moonTime.timeIntervalSince(pair.sunTime)) / 60
                guard timeDiffMinutes <= maxTimeDiffMinutes else { continue }

                let midpoint = Date(timeIntervalSince1970:
                    (pair.moonTime.timeIntervalSince1970 + pair.sunTime.timeIntervalSince1970) / 2)

                let moonPos = SunCalc.getMoonPosition(timeAndDate: midpoint, latitude: lat, longitude: lon)
                let sunPos = SunCalc.getSunPosition(timeAndDate: midpoint, latitude: lat, longitude: lon)
                let moonAzimuth = azimuthFromNorth(moonPos.azimuth)
                let sunAzimuth = azimuthFromNorth(sunPos.azimuth)

                let targetAzimuth = pair.type.isCrossPair ? sunAzimuth + 180 : sunAzimuth
                let deviation = circularDifference(moonAzimuth, targetAzimuth)
                guard deviation <= maxAzimuthDeviationDegrees else { continue }

                let illumination = SunCalc.getMoonIllumination(timeAndDate: midpoint).fraction * 100
                guard illumination >= minMoonIlluminationPercent else { continue }
                let illuminationPercent = Int(illumination.rounded())

                let direction = Formatting.compassDirection(moonAzimuth)
                let deviationText = "\(Int(deviation.rounded()))\u{00B0}"
                let description = pair.type.isCrossPair
                    ? "Moon opposite the Sun (\(deviationText) off) at \(direction), \(illuminationPercent)% illuminated"
                    : "Moon \(deviationText) from Sun at \(direction), \(illuminationPercent)% illuminated"

                events.append(ProximityEvent(
                    date: dayStart,
                    type: pair.type,
                    timeDiffMinutes: (timeDiffMinutes * 10).rounded() / 10,
                    azimuthDiff: (deviation * 10).rounded() / 10,
                    moonIllumination: Double(illuminationPercent),
                    description: description,
                    moonTime: pair.moonTime,
                    sunTime: pair.sunTime
                ))
            }
        }

        events.sort { ($0.date, $0.sunTime) < ($1.date, $1.sunTime) }
        return events
    }
}
