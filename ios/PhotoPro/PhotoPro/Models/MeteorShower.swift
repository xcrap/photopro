import Foundation

struct MeteorShowerData: Codable, Identifiable {
    var id: String { name }
    var name: String
    var solarLongitudePeak: Double
    var solarLongitudeStart: Double
    var solarLongitudeEnd: Double
    var radiantRA: Double
    var radiantDec: Double
    var zhr: Int
    var velocity: Double
    var parentBody: String
    var description: String
}

struct MeteorShowerEvent: Identifiable {
    var id: String { "\(name)-\(peakDate.timeIntervalSince1970)" }
    var name: String
    var peakDate: Date
    var startDate: Date
    var endDate: Date
    var zhr: Int
    var velocity: Double
    var parentBody: String
    var description: String
    var moonIllumination: Double
    var visibilityRating: String
    var isActive: Bool
}
