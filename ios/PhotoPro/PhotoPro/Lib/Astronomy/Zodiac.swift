import Foundation

private let zodiacSigns: [(sign: String, symbol: String, startDeg: Double)] = [
    ("Aries", "\u{2648}", 0),
    ("Taurus", "\u{2649}", 30),
    ("Gemini", "\u{264A}", 60),
    ("Cancer", "\u{264B}", 90),
    ("Leo", "\u{264C}", 120),
    ("Virgo", "\u{264D}", 150),
    ("Libra", "\u{264E}", 180),
    ("Scorpio", "\u{264F}", 210),
    ("Sagittarius", "\u{2650}", 240),
    ("Capricorn", "\u{2651}", 270),
    ("Aquarius", "\u{2652}", 300),
    ("Pisces", "\u{2653}", 330),
]

enum Zodiac {
    /// Get the zodiac sign for a given date based on the ecliptic longitude of the sun.
    static func getZodiacSign(date: Date) -> (sign: String, symbol: String) {
        let eclipticLongitude = getEclipticLongitude(date)

        for i in stride(from: zodiacSigns.count - 1, through: 0, by: -1) {
            if eclipticLongitude >= zodiacSigns[i].startDeg {
                return (zodiacSigns[i].sign, zodiacSigns[i].symbol)
            }
        }

        return (zodiacSigns[0].sign, zodiacSigns[0].symbol)
    }

    /// Calculate the approximate moon zodiac sign.
    static func getMoonZodiacSign(date: Date) -> String {
        let moonLongitude = getApproxMoonEclipticLongitude(date)

        for i in stride(from: zodiacSigns.count - 1, through: 0, by: -1) {
            if moonLongitude >= zodiacSigns[i].startDeg {
                return zodiacSigns[i].sign
            }
        }

        return zodiacSigns[0].sign
    }

    /// Approximate the sun's ecliptic longitude for a given date.
    private static func getEclipticLongitude(_ date: Date) -> Double {
        let j2000 = Date(timeIntervalSince1970: 946728000) // 2000-01-01 12:00 UTC
        let daysSinceJ2000 = date.timeIntervalSince(j2000) / 86400

        let L = (280.460 + 0.9856474 * daysSinceJ2000).truncatingRemainder(dividingBy: 360)
        let g = ((357.528 + 0.9856003 * daysSinceJ2000).truncatingRemainder(dividingBy: 360)) * .pi / 180

        var eclipticLon = (L + 1.915 * sin(g) + 0.020 * sin(2 * g))
            .truncatingRemainder(dividingBy: 360)
        if eclipticLon < 0 { eclipticLon += 360 }

        return eclipticLon
    }

    /// Approximate the moon's ecliptic longitude for a given date.
    private static func getApproxMoonEclipticLongitude(_ date: Date) -> Double {
        let j2000 = Date(timeIntervalSince1970: 946728000)
        let d = date.timeIntervalSince(j2000) / 86400

        let L = (218.316 + 13.176396 * d).truncatingRemainder(dividingBy: 360)
        let M = (134.963 + 13.064993 * d).truncatingRemainder(dividingBy: 360)
        let F = (93.272 + 13.229350 * d).truncatingRemainder(dividingBy: 360)

        let Mrad = M * .pi / 180
        let Frad = F * .pi / 180

        let longitude = L + 6.289 * sin(Mrad)
            + 1.274 * sin(2 * Frad - Mrad)
            + 0.658 * sin(2 * Frad)

        var normalized = longitude.truncatingRemainder(dividingBy: 360)
        if normalized < 0 { normalized += 360 }

        return normalized
    }
}
