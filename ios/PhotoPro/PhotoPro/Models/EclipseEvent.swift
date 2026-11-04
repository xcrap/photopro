import Foundation

enum EclipseType: String, Codable, Sendable {
    case total
    case partial
    case annular
    case penumbral
    case hybrid

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = EclipseType(rawValue: raw.lowercased()) ?? .partial
    }
}

enum EclipseCategory: String, Codable, Sendable {
    case solar
    case lunar
}

struct EclipseVisibility: Codable, Sendable {
    var region: String
    var bounds: EclipseBounds
    var percentage: Double
}

struct EclipseBounds: Codable, Sendable {
    var latMin: Double
    var latMax: Double
    var lonMin: Double
    var lonMax: Double
}

struct EclipseEvent: Identifiable, Decodable, Sendable {
    var id: String { "\(dateString)-\(category.rawValue)" }
    /// Peak instant (parsed once from `dateString`).
    var date: Date
    var dateString: String
    var type: EclipseType
    var category: EclipseCategory
    var duration: String
    var magnitude: Double
    var visibility: [EclipseVisibility]
    var description: String
    /// Legacy UTC display string from the JSON; the UI formats `date` in the location time zone instead.
    var peakTime: String?

    enum CodingKeys: String, CodingKey {
        case dateString = "date"
        case type, category, duration, magnitude, visibility, description, peakTime
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        dateString = try c.decode(String.self, forKey: .dateString)
        guard let parsed = ISODate.parse(dateString) else {
            throw DecodingError.dataCorruptedError(forKey: .dateString, in: c, debugDescription: "Invalid ISO 8601 date \(dateString)")
        }
        date = parsed
        type = try c.decode(EclipseType.self, forKey: .type)
        category = try c.decode(EclipseCategory.self, forKey: .category)
        duration = try c.decodeIfPresent(String.self, forKey: .duration) ?? ""
        magnitude = try c.decodeIfPresent(Double.self, forKey: .magnitude) ?? 0
        visibility = try c.decodeIfPresent([EclipseVisibility].self, forKey: .visibility) ?? []
        description = try c.decodeIfPresent(String.self, forKey: .description) ?? ""
        peakTime = try c.decodeIfPresent(String.self, forKey: .peakTime)
    }
}

/// Decodes an array element-by-element, dropping entries that fail instead of failing the whole file.
struct LossyDecodable<T: Decodable>: Decodable {
    let value: T?

    init(from decoder: Decoder) throws {
        value = try? T(from: decoder)
    }
}
