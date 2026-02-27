import Foundation

enum NextEventType {
    case fullMoon(FullMoonEvent)
    case proximity(ProximityEvent)
    case meteorShower(MeteorShowerEvent)
    case comet(CometEvent)
    case solarEclipse(EclipseEvent)
    case lunarEclipse(EclipseEvent)
}

struct NextEvent: Identifiable {
    var id: String { "\(type)-\(date.timeIntervalSince1970)" }
    var date: Date
    var title: String
    var type: String
    var icon: String // SF Symbol name
    var eventType: NextEventType
}
