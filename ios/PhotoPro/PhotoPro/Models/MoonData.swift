import Foundation

struct MoonData {
    var phase: Double
    var phaseName: String
    var illumination: Double
    var age: Double
    var distance: Double
    var emoji: String
    var altitude: Double
    var azimuth: Double
    var tiltAngle: Double
    var moonrise: Date?
    var moonset: Date?
}

struct FullMoonEvent: Identifiable {
    var id: String { "\(date.timeIntervalSince1970)" }
    var date: Date
    var name: String
    var folkName: String
    var isSupermoon: Bool
    var distance: Double?
}
