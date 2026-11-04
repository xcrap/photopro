import Foundation

struct Location: Codable, Equatable, Sendable {
    var latitude: Double
    var longitude: Double
    var name: String?
}

struct SavedLocation: Codable, Identifiable, Equatable, Sendable {
    var id: String
    var name: String
    var latitude: Double
    var longitude: Double
    /// IANA time zone of the location (from the forecast); `nil` until known.
    var timeZoneIdentifier: String?
}

struct CityPreset: Codable, Identifiable, Sendable {
    var name: String
    var latitude: Double
    var longitude: Double
    var country: String

    var id: String { "\(name)-\(country)" }
}

enum GpsStatus: String, Codable, Sendable {
    case idle
    case requesting
    case granted
    case denied
    case error
}

enum TimeFormat: String, Codable, CaseIterable, Sendable {
    case twelveHour = "12h"
    case twentyFourHour = "24h"

    var label: String {
        switch self {
        case .twelveHour: return "12-hour"
        case .twentyFourHour: return "24-hour"
        }
    }
}

/// Coordinate key shared by the weather cache and location matching:
/// the coordinates rounded to 3 decimals (ALGORITHM.md → "Weather Data Source").
enum LocationKey {
    static func make(latitude: Double, longitude: Double) -> String {
        String(format: "%.3f:%.3f", latitude, longitude)
    }
}

/// Parsing and validation for manually typed coordinates.
enum CoordinateInput {
    /// Accepts "38.7", "38,7", "-25.67" and "−25.67" (Unicode minus); surrounding spaces are ignored.
    static func parse(_ text: String) -> Double? {
        let normalized = text
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "\u{2212}", with: "-")
            .replacingOccurrences(of: ",", with: ".")
        guard !normalized.isEmpty, let value = Double(normalized), value.isFinite else { return nil }
        return value
    }

    static func latitudeError(_ text: String) -> String? {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
        guard let value = parse(text), (-90...90).contains(value) else {
            return "Latitude must be a number between -90 and 90"
        }
        return nil
    }

    static func longitudeError(_ text: String) -> String? {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return nil }
        guard let value = parse(text), (-180...180).contains(value) else {
            return "Longitude must be a number between -180 and 180"
        }
        return nil
    }

    /// Valid coordinate pair, or `nil` if either value is missing or out of range.
    static func validated(latitude: String, longitude: String) -> (latitude: Double, longitude: Double)? {
        guard let lat = parse(latitude), (-90...90).contains(lat),
              let lon = parse(longitude), (-180...180).contains(lon) else { return nil }
        return (lat, lon)
    }
}
