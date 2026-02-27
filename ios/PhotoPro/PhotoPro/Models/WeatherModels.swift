import Foundation

struct WeatherForecast: Codable {
    var latitude: Double
    var longitude: Double
    var hourly: HourlyForecast
    var fetchedAt: TimeInterval

    struct HourlyForecast: Codable {
        var time: [String]
        var windSpeed10m: [Double]
        var cloudCover: [Int]
        var cloudCoverLow: [Int]
        var cloudCoverMid: [Int]
        var cloudCoverHigh: [Int]
        var relativeHumidity2m: [Int]

        enum CodingKeys: String, CodingKey {
            case time
            case windSpeed10m = "wind_speed_10m"
            case cloudCover = "cloud_cover"
            case cloudCoverLow = "cloud_cover_low"
            case cloudCoverMid = "cloud_cover_mid"
            case cloudCoverHigh = "cloud_cover_high"
            case relativeHumidity2m = "relative_humidity_2m"
        }
    }
}

struct HourlyWeather {
    var time: Date
    var windSpeed: Double
    var cloudCover: Int
    var cloudCoverLow: Int
    var cloudCoverMid: Int
    var cloudCoverHigh: Int
    var humidity: Int
}

enum WeatherProfile: String {
    case sunset
    case night
}

struct ScoredConditions {
    var score: Int
    var windScore: Int
    var cloudScore: Int
    var humidityScore: Int
    var moonScore: Int
    var rating: String
    var summary: String
    // Raw weather values for display
    var windSpeed: Double
    var cloudCover: Int
    var humidity: Int
}

struct DailyPhotoScore: Identifiable {
    var id: String { date }
    var date: String
    var displayDate: Date
    var bestTime: Date
    var bestProfile: WeatherProfile
    var score: Int
    var conditions: ScoredConditions
    var trend: ScoreTrend
    var trendDelta: Int
}

enum ScoreTrend: String {
    case improving
    case steady
    case declining
}
