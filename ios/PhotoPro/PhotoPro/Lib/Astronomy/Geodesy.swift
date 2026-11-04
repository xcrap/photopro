import Foundation
import CoreLocation

/// Great-circle helpers for the map rays (spherical Earth).
enum Geodesy {
    static let earthRadius = 6_371_008.8

    /// Point `meters` along a great circle from `start` at initial `bearing` (degrees from north).
    static func destination(from start: CLLocationCoordinate2D, bearing: Double, meters: Double) -> CLLocationCoordinate2D {
        let rad = Double.pi / 180
        let d = meters / earthRadius
        let b = bearing * rad
        let lat1 = start.latitude * rad
        let lon1 = start.longitude * rad
        let lat2 = asin(sin(lat1) * cos(d) + cos(lat1) * sin(d) * cos(b))
        let lon2 = lon1 + atan2(sin(b) * sin(d) * cos(lat1), cos(d) - sin(lat1) * sin(lat2))
        let lonDeg = (lon2 / rad + 540).truncatingRemainder(dividingBy: 360) - 180
        return CLLocationCoordinate2D(latitude: lat2 / rad, longitude: lonDeg)
    }

    /// Great-circle polyline from `start` toward `bearing`, `steps` segments long.
    static func bearingLine(from start: CLLocationCoordinate2D, bearing: Double, meters: Double, steps: Int = 24) -> [CLLocationCoordinate2D] {
        [start] + (1...max(1, steps)).map { destination(from: start, bearing: bearing, meters: meters * Double($0) / Double(steps)) }
    }
}
