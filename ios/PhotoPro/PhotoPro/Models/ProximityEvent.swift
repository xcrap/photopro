import Foundation

enum ProximityType: String, Codable {
    case moonriseSunrise = "moonrise-sunrise"
    case moonriseSunset = "moonrise-sunset"
    case moonsetSunrise = "moonset-sunrise"
    case moonsetSunset = "moonset-sunset"

    var label: String {
        switch self {
        case .moonriseSunrise: return "Moonrise + Sunrise"
        case .moonriseSunset: return "Moonrise + Sunset"
        case .moonsetSunrise: return "Moonset + Sunrise"
        case .moonsetSunset: return "Moonset + Sunset"
        }
    }

    var moonLabel: String {
        switch self {
        case .moonriseSunrise, .moonriseSunset: return "Moonrise"
        case .moonsetSunrise, .moonsetSunset: return "Moonset"
        }
    }

    var sunLabel: String {
        switch self {
        case .moonriseSunrise, .moonsetSunrise: return "Sunrise"
        case .moonriseSunset, .moonsetSunset: return "Sunset"
        }
    }
}

enum ProximityQuality {
    case excellent
    case good
    case fair

    var label: String {
        switch self {
        case .excellent: return "Excellent"
        case .good: return "Good"
        case .fair: return "Fair"
        }
    }
}

struct ProximityEvent: Identifiable {
    var id: String { "\(date.timeIntervalSince1970)-\(type.rawValue)" }
    var date: Date
    var type: ProximityType
    var timeDiffMinutes: Double
    var azimuthDiff: Double
    var moonIllumination: Double
    var description: String
    var moonTime: Date
    var sunTime: Date

    var quality: ProximityQuality {
        if azimuthDiff <= 5 && timeDiffMinutes <= 10 { return .excellent }
        if azimuthDiff <= 10 && timeDiffMinutes <= 20 { return .good }
        return .fair
    }

    /// Astronomy-only score (0–100).
    var astronomyScore: Int {
        let azScore = max(0, min(100, 100 - (azimuthDiff / 30) * 100))
        let timeScore = max(0, min(100, 100 - (timeDiffMinutes / 30) * 100))
        return Int((azScore * 0.6 + timeScore * 0.4).rounded())
    }

    /// Timing context line, e.g. "Moonrise 5min before Sunrise".
    var timingDescription: String {
        let minutes = Int(timeDiffMinutes.rounded())
        let moonFirst = moonTime < sunTime
        let relation = moonFirst ? "before" : "after"
        return "\(type.moonLabel) \(minutes)min \(relation) \(type.sunLabel)"
    }
}
