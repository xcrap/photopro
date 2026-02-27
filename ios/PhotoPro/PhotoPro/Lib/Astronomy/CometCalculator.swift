import Foundation

enum CometCalculator {
    // MARK: - JSON Data Loading

    private struct CometJSON: Codable {
        var id: String
        var name: String
        var peakStart: String
        var peakEnd: String
        var peakDate: String
        var magnitude: Double
        var visibility: CometVisibility
        var bestViewingTime: String
        var direction: String
        var description: String

        struct CometVisibility: Codable {
            var hemisphere: String?
            var minLatitude: Double?
            var declinationRange: DeclinationRange?

            struct DeclinationRange: Codable {
                var min: Double
                var max: Double
            }
        }
    }

    private static var cometsCache: [CometJSON]?

    private static func loadComets() -> [CometJSON] {
        if let cache = cometsCache { return cache }
        guard let url = Bundle.main.url(forResource: "comets", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([CometJSON].self, from: data) else {
            return []
        }
        cometsCache = decoded
        return decoded
    }

    // MARK: - Public API

    /// Get active and upcoming comets for a given location.
    static func getComets(userLatitude: Double) -> [CometEvent] {
        let comets = loadComets()
        let now = Date()
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let fallbackFormatter = ISO8601DateFormatter()

        func parseDate(_ string: String) -> Date {
            isoFormatter.date(from: string) ?? fallbackFormatter.date(from: string) ?? Date()
        }

        return comets
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
                let peakStartDate = parseDate(comet.peakStart)
                let peakEndDate = parseDate(comet.peakEnd)
                let peakDateParsed = parseDate(comet.peakDate)

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
