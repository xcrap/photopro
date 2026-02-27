import Foundation

enum VisibilityRating: String {
    case excellent
    case good
    case poor
    case notVisible = "not-visible"

    var label: String {
        switch self {
        case .excellent: return "Excellent visibility"
        case .good: return "Good visibility"
        case .poor: return "Low on horizon"
        case .notVisible: return "Not visible from your location"
        }
    }
}

enum Visibility {
    /// Calculate maximum altitude an object can reach from a given latitude.
    static func getMaxAltitude(userLatitude: Double, objectDeclination: Double) -> Double {
        90 - abs(userLatitude - objectDeclination)
    }

    /// Get visibility rating based on maximum altitude.
    static func getVisibilityRating(_ maxAltitude: Double) -> VisibilityRating {
        if maxAltitude >= 45 { return .excellent }
        if maxAltitude >= 25 { return .good }
        if maxAltitude >= 10 { return .poor }
        return .notVisible
    }

    /// Check if a comet is visible from a given latitude.
    static func isCometVisible(hemisphere: String?, minLatitude: Double?, declinationMin: Double?, declinationMax: Double?, userLatitude: Double) -> Bool {
        if hemisphere == "northern" && userLatitude < 0 { return false }
        if hemisphere == "southern" && userLatitude > 0 { return false }

        if let minLat = minLatitude {
            if hemisphere == "northern" && userLatitude < minLat { return false }
            if hemisphere == "southern" && userLatitude > -minLat { return false }
        }

        if let dMin = declinationMin, let dMax = declinationMax {
            let avgDec = (dMin + dMax) / 2
            let maxAlt = getMaxAltitude(userLatitude: userLatitude, objectDeclination: avgDec)
            if maxAlt < 10 { return false }
        }

        return true
    }
}
