import Foundation

struct MoonData: Sendable {
    var phase: Double
    var phaseName: String
    var illumination: Double
    var age: Double
    /// Geocentric distance from the Meeus ephemeris (km).
    var distance: Double
    var emoji: String
    var altitude: Double
    var azimuth: Double
    var tiltAngle: Double
    var moonrise: Date?
    var moonset: Date?
}

struct FullMoonEvent: Identifiable, Sendable {
    var id: String { "\(date.timeIntervalSince1970)" }
    var date: Date
    var name: String
    var folkName: String
    var isSupermoon: Bool
    /// Meeus distance at the full moon instant (km).
    var distance: Double?
}
