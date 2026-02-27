import Foundation

enum SolarLongitude {
    /// Calculate Julian Date from a Swift Date
    static func getJulianDate(_ date: Date) -> Double {
        date.timeIntervalSince1970 / 86400.0 + 2440587.5
    }

    /// Calculate solar longitude for a given date. Returns degrees (0-360).
    static func getSolarLongitude(_ date: Date) -> Double {
        let JD = getJulianDate(date)
        let T = (JD - 2451545.0) / 36525.0

        let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T

        let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
        let Mrad = M * .pi / 180.0

        let C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(Mrad)
            + (0.019993 - 0.000101 * T) * sin(2 * Mrad)
            + 0.00029 * sin(3 * Mrad)

        var longitude = L0 + C
        longitude = longitude.truncatingRemainder(dividingBy: 360)
        if longitude < 0 { longitude += 360 }

        return longitude
    }

    /// Find the date when the Sun reaches a target solar longitude in a given year.
    static func findDateForSolarLongitude(_ targetLongitude: Double, year: Int) -> Date {
        let daysFromEquinox = (targetLongitude / 360.0) * 365.25
        let calendar = Calendar.current
        let marchEquinox = calendar.date(from: DateComponents(year: year, month: 3, day: 20))!
        let estimatedDate = marchEquinox.addingTimeInterval(daysFromEquinox * 86400)

        var low = estimatedDate.addingTimeInterval(-5 * 86400)
        var high = estimatedDate.addingTimeInterval(5 * 86400)

        for _ in 0..<20 {
            let midInterval = (low.timeIntervalSince1970 + high.timeIntervalSince1970) / 2
            let mid = Date(timeIntervalSince1970: midInterval)
            let longitude = getSolarLongitude(mid)

            var diff = longitude - targetLongitude
            if diff > 180 { diff -= 360 }
            if diff < -180 { diff += 360 }

            if abs(diff) < 0.01 {
                return mid
            }

            if diff < 0 {
                low = mid
            } else {
                high = mid
            }
        }

        return estimatedDate
    }
}
