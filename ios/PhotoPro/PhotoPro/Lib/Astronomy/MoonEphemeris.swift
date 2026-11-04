import Foundation

/// Moon ephemeris from Meeus, "Astronomical Algorithms", chapter 47.
///
/// SunCalc's moon distance (`385001 − 20905·cos M`) can never drop below 364,096 km and its
/// phase is only accurate to about ±3 h, so supermoons, the displayed distance and full/new
/// moon instants use this instead. See ALGORITHM.md → "Moon Ephemeris" and the appendix.
enum MoonEphemeris {
    /// Full moons closer than this are supermoons (ALGORITHM.md → "Special Moon Events").
    static let supermoonDistanceKm: Double = 362_000

    /// Aberration correction applied to the Sun's true longitude (degrees).
    private static let sunAberrationDeg = 0.00569

    /// Meeus Table 47.A: (D, M, M′, F, Σl coefficient [1e-6 deg], Σr coefficient [1e-3 km]).
    private static let table47A: [(d: Double, m: Double, mp: Double, f: Double, l: Double, r: Double)] = [
    (0, 0, 1, 0, 6288774, -20905355),
    (2, 0, -1, 0, 1274027, -3699111),
    (2, 0, 0, 0, 658314, -2955968),
    (0, 0, 2, 0, 213618, -569925),
    (0, 1, 0, 0, -185116, 48888),
    (0, 0, 0, 2, -114332, -3149),
    (2, 0, -2, 0, 58793, 246158),
    (2, -1, -1, 0, 57066, -152138),
    (2, 0, 1, 0, 53322, -170733),
    (2, -1, 0, 0, 45758, -204586),
    (0, 1, -1, 0, -40923, -129620),
    (1, 0, 0, 0, -34720, 108743),
    (0, 1, 1, 0, -30383, 104755),
    (2, 0, 0, -2, 15327, 10321),
    (0, 0, 1, 2, -12528, 0),
    (0, 0, 1, -2, 10980, 79661),
    (4, 0, -1, 0, 10675, -34782),
    (0, 0, 3, 0, 10034, -23210),
    (4, 0, -2, 0, 8548, -21636),
    (2, 1, -1, 0, -7888, 24208),
    (2, 1, 0, 0, -6766, 30824),
    (1, 0, -1, 0, -5163, -8379),
    (1, 1, 0, 0, 4987, -16675),
    (2, -1, 1, 0, 4036, -12831),
    (2, 0, 2, 0, 3994, -10445),
    (4, 0, 0, 0, 3861, -11650),
    (2, 0, -3, 0, 3665, 14403),
    (0, 1, -2, 0, -2689, -7003),
    (2, 0, -1, 2, -2602, 0),
    (2, -1, -2, 0, 2390, 10056),
    (1, 0, 1, 0, -2348, 6322),
    (2, -2, 0, 0, 2236, -9884),
    (0, 1, 2, 0, -2120, 5751),
    (0, 2, 0, 0, -2069, 0),
    (2, -2, -1, 0, 2048, -4950),
    (2, 0, 1, -2, -1773, 4130),
    (2, 0, 0, 2, -1595, 0),
    (4, -1, -1, 0, 1215, -3958),
    (0, 0, 2, 2, -1110, 0),
    (3, 0, -1, 0, -892, 3258),
    (2, 1, 1, 0, -810, 2616),
    (4, -1, -2, 0, 759, -1897),
    (0, 2, -1, 0, -713, -2117),
    (2, 2, -1, 0, -700, 2354),
    (2, 1, -2, 0, 691, 0),
    (2, -1, 0, -2, 596, 0),
    (4, 0, 1, 0, 549, -1423),
    (0, 0, 4, 0, 537, -1117),
    (4, -1, 0, 0, 520, -1571),
    (1, 0, -2, 0, -487, -1739),
    (2, 1, 0, -2, -399, 0),
    (0, 0, 2, -2, -381, -4421),
    (1, 1, 1, 0, 351, 0),
    (3, 0, -2, 0, -340, 0),
    (4, 0, -3, 0, 330, 0),
    (2, -1, 2, 0, 327, 0),
    (0, 2, 1, 0, -323, 1165),
    (1, 1, -1, 0, 299, 0),
    (2, 0, 3, 0, 294, 0),
    (2, 0, -1, -2, 0, 8752),
    ]

    private static let rad = Double.pi / 180

    struct Series: Sendable {
        /// Geocentric ecliptic longitude of the Moon, degrees 0–360.
        var longitude: Double
        /// Geocentric Earth–Moon distance, km.
        var distanceKm: Double
    }

    static func normalizeDegrees(_ value: Double) -> Double {
        let r = value.truncatingRemainder(dividingBy: 360)
        return r < 0 ? r + 360 : r
    }

    /// Julian centuries since J2000.0 for an instant.
    static func julianCenturies(_ date: Date) -> Double {
        let jd = date.timeIntervalSince1970 / 86400 + 2440587.5
        return (jd - 2451545) / 36525
    }

    static func series(at date: Date) -> Series {
        let T = julianCenturies(date)
        let T2 = T * T
        let T3 = T2 * T
        let T4 = T3 * T

        let Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000
        let D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000
        let M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000
        let Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000
        let F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000
        let A1 = 119.75 + 131.849 * T
        let A2 = 53.09 + 479264.290 * T
        let E = 1 - 0.002516 * T - 0.0000074 * T2

        var sumL = 3958 * sin(A1 * rad) + 1962 * sin((Lp - F) * rad) + 318 * sin(A2 * rad)
        var sumR = 0.0

        for term in table47A {
            let eccentricity: Double
            switch abs(term.m) {
            case 1: eccentricity = E
            case 2: eccentricity = E * E
            default: eccentricity = 1
            }
            let argument = (term.d * D + term.m * M + term.mp * Mp + term.f * F) * rad
            sumL += term.l * eccentricity * sin(argument)
            sumR += term.r * eccentricity * cos(argument)
        }

        return Series(
            longitude: normalizeDegrees(Lp + sumL / 1_000_000),
            distanceKm: 385000.56 + sumR / 1000
        )
    }

    /// Geocentric ecliptic longitude of the Moon in degrees (0–360).
    static func eclipticLongitude(at date: Date) -> Double {
        series(at: date).longitude
    }

    /// Geocentric Earth–Moon distance in km.
    static func distanceKm(at date: Date) -> Double {
        series(at: date).distanceKm
    }

    /// Moon − Sun ecliptic longitude in degrees (0 = new moon, 180 = full moon).
    static func elongation(at date: Date) -> Double {
        let sunLongitude = SolarLongitude.getSolarLongitude(date) - sunAberrationDeg
        return normalizeDegrees(eclipticLongitude(at: date) - sunLongitude)
    }

    // MARK: - Full / New Moon Detection

    enum PhaseTarget: Sendable {
        case new
        case full
    }

    private static func isBeforeTarget(_ elongation: Double, _ target: PhaseTarget) -> Bool {
        switch target {
        case .full: return elongation < 180
        case .new: return elongation > 180
        }
    }

    private static func hasCrossedTarget(previous: Double, current: Double, _ target: PhaseTarget) -> Bool {
        switch target {
        case .full: return previous < 180 && current >= 180
        case .new: return previous > 300 && current < 60
        }
    }

    /// Every new or full moon instant in `[start, end)`.
    /// Samples the elongation once per day, then bisects the crossing day to under 1 second.
    static func findPhaseInstants(start: Date, end: Date, target: PhaseTarget) -> [Date] {
        var results: [Date] = []
        let startT = start.timeIntervalSince1970
        let endT = end.timeIntervalSince1970
        var t = startT
        var previous = elongation(at: start)

        while t < endT {
            let next = t + 86400
            let current = elongation(at: Date(timeIntervalSince1970: next))

            if hasCrossedTarget(previous: previous, current: current, target) {
                var lo = t
                var hi = next
                while hi - lo > 1 {
                    let mid = (lo + hi) / 2
                    if isBeforeTarget(elongation(at: Date(timeIntervalSince1970: mid)), target) {
                        lo = mid
                    } else {
                        hi = mid
                    }
                }
                let instant = ((lo + hi) / 2).rounded()
                if instant >= startT && instant < endT {
                    results.append(Date(timeIntervalSince1970: instant))
                }
            }

            previous = current
            t = next
        }

        return results
    }
}
