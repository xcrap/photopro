import Foundation

enum SpecialEventType: String, Codable {
    case supermoon
    case blueMoon = "blue-moon"
    case microMoon = "micro-moon"
    case blackMoon = "black-moon"

    var label: String {
        switch self {
        case .supermoon: return "Supermoon"
        case .blueMoon: return "Blue Moon"
        case .microMoon: return "Micro Moon"
        case .blackMoon: return "Black Moon"
        }
    }
}

struct SpecialEvent: Identifiable {
    var id: String { "\(date.timeIntervalSince1970)-\(type.rawValue)" }
    var date: Date
    var type: SpecialEventType
    var name: String
    var description: String
}
