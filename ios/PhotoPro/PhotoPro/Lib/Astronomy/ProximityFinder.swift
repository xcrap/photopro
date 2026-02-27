import Foundation
import SunCalc

private let maxTimeDiffMinutes: Double = 30
private let maxAzimuthDiffDegrees: Double = 30

private let directions16 = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
]

enum ProximityFinder {
    private static func compassDirection(_ azimuth: Double) -> String {
        let index = Int((azimuth / 22.5).rounded()) % 16
        return directions16[index]
    }

    private static func azimuthDifference(_ az1: Double, _ az2: Double) -> Double {
        var diff = abs(az1 - az2)
        if diff > 180 { diff = 360 - diff }
        return diff
    }

    /// Find proximity events where the moon and sun rise or set near each other.
    static func findProximityEvents(startDate: Date, days: Int, lat: Double, lon: Double) -> [ProximityEvent] {
        var events: [ProximityEvent] = []

        let noonAnchor = AstroDateHelper.noonUTC(for: startDate)
        let midnightAnchor = AstroDateHelper.localMidnight(for: startDate)

        for i in 0..<days {
            guard let sunDate = AstroDateHelper.addDaysNoonUTC(i, to: noonAnchor),
                  let moonDate = AstroDateHelper.addDaysLocalMidnight(i, to: midnightAnchor) else { continue }

            let sunTimes = SunCalc.getTimes(date: sunDate, latitude: lat, longitude: lon)
            let moonTimes = SunCalc.getMoonTimes(date: moonDate, latitude: lat, longitude: lon)

            let moonrise = moonTimes.rise
            let moonset = moonTimes.set
            guard let sunrise = sunTimes.sunrise, let sunset = sunTimes.sunset else { continue }

            struct TimePair {
                var moonTime: Date
                var sunTime: Date
                var type: ProximityType
            }

            var pairs: [TimePair] = []

            if let mr = moonrise {
                pairs.append(TimePair(moonTime: mr, sunTime: sunrise, type: .moonriseSunrise))
                pairs.append(TimePair(moonTime: mr, sunTime: sunset, type: .moonriseSunset))
            }
            if let ms = moonset {
                pairs.append(TimePair(moonTime: ms, sunTime: sunrise, type: .moonsetSunrise))
                pairs.append(TimePair(moonTime: ms, sunTime: sunset, type: .moonsetSunset))
            }

            for pair in pairs {
                let timeDiffMs = abs(pair.moonTime.timeIntervalSince(pair.sunTime))
                let timeDiffMinutes = timeDiffMs / 60

                guard timeDiffMinutes <= maxTimeDiffMinutes else { continue }

                let midpointMs = (pair.moonTime.timeIntervalSince1970 + pair.sunTime.timeIntervalSince1970) / 2
                let midpointDate = Date(timeIntervalSince1970: midpointMs)

                let moonPos = SunCalc.getMoonPosition(timeAndDate: midpointDate, latitude: lat, longitude: lon)
                let sunPos = SunCalc.getSunPosition(timeAndDate: midpointDate, latitude: lat, longitude: lon)

                let moonAzimuth = ((moonPos.azimuth * 180 / .pi) + 180).truncatingRemainder(dividingBy: 360)
                let sunAzimuth = ((sunPos.azimuth * 180 / .pi) + 180).truncatingRemainder(dividingBy: 360)

                let azDiff = azimuthDifference(moonAzimuth, sunAzimuth)
                guard azDiff <= maxAzimuthDiffDegrees else { continue }

                let moonIllumination = SunCalc.getMoonIllumination(timeAndDate: midpointDate)
                let illuminationPercent = Int((moonIllumination.fraction * 100).rounded())

                let avgAzimuth = (moonAzimuth + sunAzimuth) / 2
                let direction = compassDirection(avgAzimuth)

                let description = "Moon \(Int(azDiff.rounded()))\u{00B0} from Sun at \(direction), \(illuminationPercent)% illuminated"

                events.append(ProximityEvent(
                    date: moonDate,
                    type: pair.type,
                    timeDiffMinutes: (timeDiffMinutes * 10).rounded() / 10,
                    azimuthDiff: (azDiff * 10).rounded() / 10,
                    moonIllumination: Double(illuminationPercent),
                    description: description,
                    moonTime: pair.moonTime,
                    sunTime: pair.sunTime
                ))
            }
        }

        events.sort { $0.date < $1.date }
        return events
    }
}
