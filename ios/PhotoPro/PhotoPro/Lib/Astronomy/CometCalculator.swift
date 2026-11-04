import Foundation

enum CometCalculator {
    // MARK: - JSON Data Loading

    private struct CometJSON: Decodable, Sendable {
        var id: String
        var name: String
        var peakStart: String
        var peakEnd: String
        var peakDate: String
        var magnitude: Double
        var visibility: CometVisibility
        var bestViewingTime: String?
        var direction: String?
        var description: String

        struct CometVisibility: Decodable, Sendable {
            var hemisphere: String?
            var minLatitude: Double?
            var declinationRange: DeclinationRange?

            struct DeclinationRange: Decodable, Sendable {
                var min: Double
                var max: Double
            }
        }
    }

    /// Loaded once, lazily and thread-safely (static `let`). Bad entries are skipped.
    private static let comets: [CometJSON] = {
        guard let url = Bundle.main.url(forResource: "comets", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([LossyDecodable<CometJSON>].self, from: data) else {
            return []
        }
        return decoded.compactMap(\.value)
    }()

    // MARK: - Public API

    /// Active and upcoming comets for a given location.
    static func getComets(userLatitude: Double, now: Date = Date()) -> [CometEvent] {
        comets
            .filter { comet in
                Visibility.isCometVisible(
                    hemisphere: comet.visibility.hemisphere,
                    minLatitude: comet.visibility.minLatitude,
                    declinationMin: comet.visibility.declinationRange?.min,
                    declinationMax: comet.visibility.declinationRange?.max,
                    userLatitude: userLatitude
                )
            }
            .compactMap { comet in
                // An unparseable date drops the comet instead of pretending it is "now".
                guard let peakStartDate = ISODate.parse(comet.peakStart),
                      let peakEndDate = ISODate.parse(comet.peakEnd),
                      let peakDateParsed = ISODate.parse(comet.peakDate) else { return nil }

                let isActive = now >= peakStartDate && now <= peakEndDate
                let isUpcoming = now < peakStartDate

                guard isActive || isUpcoming else { return nil }

                return CometEvent(
                    name: comet.name,
                    designation: comet.id,
                    peakDate: peakDateParsed,
                    perihelionDate: peakDateParsed,
                    perihelionDistance: 0,
                    peakMagnitude: comet.magnitude,
                    hemisphere: comet.visibility.hemisphere ?? "both",
                    description: comet.description,
                    viewingDirection: comet.direction,
                    viewingTime: comet.bestViewingTime,
                    magnitudeRating: getMagnitudeRating(comet.magnitude),
                    isActive: isActive
                )
            }
            .sorted { $0.peakDate < $1.peakDate }
    }

    /// Get magnitude rating (visibility description).
    static func getMagnitudeRating(_ magnitude: Double) -> String {
        if magnitude <= 0 { return "Spectacular (very bright)" }
        if magnitude <= 2 { return "Naked eye visible" }
        if magnitude <= 4 { return "Visible with binoculars" }
        if magnitude <= 6 { return "Requires telescope" }
        return "Faint"
    }
}
