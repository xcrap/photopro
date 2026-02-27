import Foundation

enum EclipseType: String, Codable {
    case total
    case partial
    case annular
    case penumbral
}

enum EclipseCategory: String, Codable {
    case solar
    case lunar
}

struct EclipseVisibility: Codable {
    var region: String
    var bounds: EclipseBounds
    var percentage: Double
}

struct EclipseBounds: Codable {
    var latMin: Double
    var latMax: Double
    var lonMin: Double
    var lonMax: Double
}

struct EclipseEvent: Identifiable, Codable {
    var id: String { "\(dateString)-\(category.rawValue)" }
    var date: Date {
        ISO8601DateFormatter().date(from: dateString) ?? Date()
    }
    var dateString: String
    var type: EclipseType
    var category: EclipseCategory
    var duration: String
    var magnitude: Double
    var visibility: [EclipseVisibility]
    var description: String
    var peakTime: String

    enum CodingKeys: String, CodingKey {
        case dateString = "date"
        case type, category, duration, magnitude, visibility, description, peakTime
    }
}
