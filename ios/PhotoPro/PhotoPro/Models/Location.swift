import Foundation

struct Location: Codable, Equatable {
    var latitude: Double
    var longitude: Double
    var name: String?
}

struct SavedLocation: Codable, Identifiable, Equatable {
    var id: String
    var name: String
    var latitude: Double
    var longitude: Double
}

struct CityPreset: Codable, Identifiable {
    var name: String
    var latitude: Double
    var longitude: Double
    var country: String

    var id: String { "\(name)-\(country)" }
}

enum GpsStatus: String, Codable {
    case idle
    case requesting
    case granted
    case denied
    case error
}

enum TimeFormat: String, Codable, CaseIterable {
    case twelveHour = "12h"
    case twentyFourHour = "24h"

    var label: String {
        switch self {
        case .twelveHour: return "12-hour"
        case .twentyFourHour: return "24-hour"
        }
    }
}
