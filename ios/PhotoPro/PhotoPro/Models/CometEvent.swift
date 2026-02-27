import Foundation

struct CometData: Codable, Identifiable {
    var id: String { name }
    var name: String
    var designation: String
    var perihelionDate: String
    var perihelionDistance: Double
    var peakMagnitude: Double
    var peakDate: String
    var hemisphere: String
    var description: String
    var viewingDirection: String?
    var viewingTime: String?
}

struct CometEvent: Identifiable {
    var id: String { "\(name)-\(peakDate.timeIntervalSince1970)" }
    var name: String
    var designation: String
    var peakDate: Date
    var perihelionDate: Date
    var perihelionDistance: Double
    var peakMagnitude: Double
    var hemisphere: String
    var description: String
    var viewingDirection: String?
    var viewingTime: String?
    var magnitudeRating: String
    var isActive: Bool
}
