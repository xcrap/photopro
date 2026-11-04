import Foundation

/// Polar day/night state for a local day (ALGORITHM.md → "Sun Times").
enum PolarState: Sendable {
    case none
    /// Sun altitude > 0 at solar noon and no sunset.
    case alwaysUp
    /// No sunrise and sun altitude < 0 at solar noon.
    case alwaysDown

    var message: String? {
        switch self {
        case .none: return nil
        case .alwaysUp: return "Sun stays up all day"
        case .alwaysDown: return "Sun stays below the horizon"
        }
    }
}

/// Sun event times for one local day. An event is `nil` when the Sun never reaches its
/// altitude that day (polar day/night) — never substitute another time.
struct SunTimes: Sendable {
    var sunrise: Date?
    var sunset: Date?
    var solarNoon: Date?
    var goldenHourStart: Date?
    var goldenHourEnd: Date?
    var goldenHourMorningStart: Date?
    var goldenHourMorningEnd: Date?
    var blueHourMorningStart: Date?
    var blueHourMorningEnd: Date?
    var blueHourEveningStart: Date?
    var blueHourEveningEnd: Date?
    var dawn: Date?
    var dusk: Date?
    var nauticalDawn: Date?
    var nauticalDusk: Date?
    var nightStart: Date?
    var nightEnd: Date?
    var polarState: PolarState = .none
}

struct SunPosition: Sendable {
    var altitude: Double // degrees
    var azimuth: Double  // degrees, 0-360 from north
}
