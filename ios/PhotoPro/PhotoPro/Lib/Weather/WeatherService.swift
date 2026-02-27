import Foundation

private let hourlyParams = "wind_speed_10m,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m"
private let retryAttempts = 2
private let retryBaseDelayMs: UInt64 = 500
private let retryableStatusCodes: Set<Int> = [408, 429, 500, 502, 503, 504]

enum WeatherServiceError: Error, LocalizedError {
    case requestFailed(Int)
    case noData
    case networkError(String)

    var errorDescription: String? {
        switch self {
        case .requestFailed(let code): return "Weather request failed (\(code))"
        case .noData: return "Weather forecast is unavailable"
        case .networkError(let msg): return msg
        }
    }
}

// MARK: - Open-Meteo API Response

private struct OpenMeteoResponse: Codable {
    var latitude: Double
    var longitude: Double
    var timezone: String?
    var hourly: OpenMeteoHourly

    struct OpenMeteoHourly: Codable {
        var time: [String]
        var wind_speed_10m: [Double]
        var cloud_cover: [Int]
        var cloud_cover_low: [Int]
        var cloud_cover_mid: [Int]
        var cloud_cover_high: [Int]
        var relative_humidity_2m: [Int]
    }
}

enum WeatherService {
    /// Fetch weather forecast from Open-Meteo API with retry logic.
    static func fetchForecast(latitude: Double, longitude: Double, days: Int = 7) async throws -> WeatherForecast {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let startDate = Date()
        let endDate = Calendar.current.date(byAdding: .day, value: max(1, days) - 1, to: startDate)!

        let startStr = dateFormatter.string(from: startDate)
        let endStr = dateFormatter.string(from: endDate)

        var components = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        components.queryItems = [
            URLQueryItem(name: "latitude", value: String(latitude)),
            URLQueryItem(name: "longitude", value: String(longitude)),
            URLQueryItem(name: "hourly", value: hourlyParams),
            URLQueryItem(name: "timezone", value: "auto"),
            URLQueryItem(name: "start_date", value: startStr),
            URLQueryItem(name: "end_date", value: endStr),
        ]

        guard let url = components.url else {
            throw WeatherServiceError.networkError("Invalid URL")
        }

        let data = try await fetchWithRetry(url: url)
        let response = try JSONDecoder().decode(OpenMeteoResponse.self, from: data)

        guard !response.hourly.time.isEmpty else {
            throw WeatherServiceError.noData
        }

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime]

        // Also handle the simpler format from Open-Meteo (e.g. "2025-01-01T00:00")
        let fallbackFormatter = DateFormatter()
        fallbackFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm"

        let hourly = response.hourly
        let forecast = WeatherForecast(
            latitude: response.latitude,
            longitude: response.longitude,
            hourly: WeatherForecast.HourlyForecast(
                time: hourly.time,
                windSpeed10m: hourly.wind_speed_10m,
                cloudCover: hourly.cloud_cover,
                cloudCoverLow: hourly.cloud_cover_low,
                cloudCoverMid: hourly.cloud_cover_mid,
                cloudCoverHigh: hourly.cloud_cover_high,
                relativeHumidity2m: hourly.relative_humidity_2m
            ),
            fetchedAt: Date().timeIntervalSince1970
        )

        return forecast
    }

    private static func fetchWithRetry(url: URL) async throws -> Data {
        for attempt in 0...retryAttempts {
            do {
                let (data, response) = try await URLSession.shared.data(from: url)

                guard let httpResponse = response as? HTTPURLResponse else {
                    throw WeatherServiceError.networkError("Invalid response")
                }

                if httpResponse.statusCode == 200 {
                    return data
                }

                if !retryableStatusCodes.contains(httpResponse.statusCode) || attempt == retryAttempts {
                    throw WeatherServiceError.requestFailed(httpResponse.statusCode)
                }
            } catch let error as WeatherServiceError {
                if attempt == retryAttempts { throw error }
            } catch {
                if attempt == retryAttempts {
                    throw WeatherServiceError.networkError(error.localizedDescription)
                }
            }

            let delayMs = retryBaseDelayMs * UInt64(pow(2, Double(attempt)))
            try await Task.sleep(nanoseconds: delayMs * 1_000_000)
        }

        throw WeatherServiceError.networkError("Weather request failed")
    }
}
