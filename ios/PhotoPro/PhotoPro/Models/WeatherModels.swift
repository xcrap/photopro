import Foundation

struct WeatherForecast: Codable, Sendable {
    /// The **requested** coordinates (Open-Meteo snaps its response to a grid, so those never match).
    var latitude: Double
    var longitude: Double
    /// IANA time zone of the location, from Open-Meteo (`timezone=auto`).
    var timezone: String
    var hourly: HourlyForecast
    var fetchedAt: TimeInterval

    struct HourlyForecast: Codable, Sendable {
        /// Absolute instants (unix seconds, `timeformat=unixtime`).
        var time: [TimeInterval]
        var windSpeed10m: [Double]
        var cloudCover: [Int]
        var cloudCoverLow: [Int]
        var cloudCoverMid: [Int]
        var cloudCoverHigh: [Int]
        var relativeHumidity2m: [Int]

        var count: Int {
            [time.count, windSpeed10m.count, cloudCover.count, cloudCoverLow.count,
             cloudCoverMid.count, cloudCoverHigh.count, relativeHumidity2m.count].min() ?? 0
        }
    }

    var cacheKey: String { LocationKey.make(latitude: latitude, longitude: longitude) }

    /// Location time zone, falling back to the device's.
    var timeZone: TimeZone { TimeZone(identifier: timezone) ?? .current }

    func point(at index: Int) -> HourlyWeather {
        HourlyWeather(
            time: Date(timeIntervalSince1970: hourly.time[index]),
            windSpeed: hourly.windSpeed10m[index],
            cloudCover: hourly.cloudCover[index],
            cloudCoverLow: hourly.cloudCoverLow[index],
            cloudCoverMid: hourly.cloudCoverMid[index],
            cloudCoverHigh: hourly.cloudCoverHigh[index],
            humidity: hourly.relativeHumidity2m[index]
        )
    }

    var points: [HourlyWeather] { (0..<hourly.count).map(point(at:)) }
}

struct HourlyWeather: Sendable {
    var time: Date
    var windSpeed: Double
    var cloudCover: Int
    var cloudCoverLow: Int
    var cloudCoverMid: Int
    var cloudCoverHigh: Int
    var humidity: Int
}

enum WeatherProfile: String, Sendable {
    case sunset
    case night
}

struct ScoredConditions: Sendable {
    var profile: WeatherProfile
    var score: Int
    var windScore: Int
    var cloudScore: Int
    var humidityScore: Int
    var moonScore: Int
    var rating: String
    var summary: String
    /// Sub-scores in display order (e.g. "Wind", "High clouds", "Low/mid clear").
    var breakdown: [ScoreComponent]
    // Raw weather values for display
    var windSpeed: Double
    var cloudCover: Int
    var humidity: Int
}

struct ScoreComponent: Hashable, Sendable {
    var label: String
    var value: Int
}

struct DailyPhotoScore: Identifiable, Sendable {
    var id: String { date }
    /// Local calendar day key "yyyy-MM-dd" (location time zone).
    var date: String
    var displayDate: Date
    /// Observation time: the best candidate hour.
    var bestTime: Date
    var bestProfile: WeatherProfile
    var score: Int
    var conditions: ScoredConditions
    /// `nil` when the forecast doesn't cover observation time + 24 h.
    var trend: ScoreTrend?
    var trendDelta: Int?
}

enum ScoreTrend: String, Sendable {
    case improving
    case steady
    case declining

    var label: String {
        switch self {
        case .improving: return "↗ improving"
        case .steady: return "→ steady"
        case .declining: return "↘ getting worse"
        }
    }
}
