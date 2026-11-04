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

private struct OpenMeteoResponse: Decodable {
    var timezone: String?
    var hourly: OpenMeteoHourly

    /// Values are optional: Open-Meteo returns `null` for hours a model doesn't cover.
    struct OpenMeteoHourly: Decodable {
        var time: [Double]
        var wind_speed_10m: [Double?]
        var cloud_cover: [Double?]
        var cloud_cover_low: [Double?]
        var cloud_cover_mid: [Double?]
        var cloud_cover_high: [Double?]
        var relative_humidity_2m: [Double?]
    }
}

enum WeatherService {
    /// Fetch the 7-day hourly forecast from Open-Meteo (ALGORITHM.md → "Weather Data Source"):
    /// `timezone=auto` + `timeformat=unixtime`, so hourly times are absolute instants and the
    /// response carries the location's IANA time zone. `forecast_days=7` starts at local today.
    static func fetchForecast(latitude: Double, longitude: Double, days: Int = 7) async throws -> WeatherForecast {
        var components = URLComponents(string: "https://api.open-meteo.com/v1/forecast")
        components?.queryItems = [
            URLQueryItem(name: "latitude", value: String(latitude)),
            URLQueryItem(name: "longitude", value: String(longitude)),
            URLQueryItem(name: "hourly", value: hourlyParams),
            URLQueryItem(name: "timezone", value: "auto"),
            URLQueryItem(name: "timeformat", value: "unixtime"),
            URLQueryItem(name: "forecast_days", value: String(max(1, min(16, days)))),
        ]

        guard let url = components?.url else {
            throw WeatherServiceError.networkError("Invalid URL")
        }

        let data = try await fetchWithRetry(url: url)
        let response = try JSONDecoder().decode(OpenMeteoResponse.self, from: data)
        let raw = response.hourly

        // Keep only hours where every value is present.
        var hourly = WeatherForecast.HourlyForecast(
            time: [], windSpeed10m: [], cloudCover: [], cloudCoverLow: [],
            cloudCoverMid: [], cloudCoverHigh: [], relativeHumidity2m: []
        )
        for index in raw.time.indices {
            guard let wind = raw.wind_speed_10m[safe: index] ?? nil,
                  let cloud = raw.cloud_cover[safe: index] ?? nil,
                  let low = raw.cloud_cover_low[safe: index] ?? nil,
                  let mid = raw.cloud_cover_mid[safe: index] ?? nil,
                  let high = raw.cloud_cover_high[safe: index] ?? nil,
                  let humidity = raw.relative_humidity_2m[safe: index] ?? nil else { continue }
            hourly.time.append(raw.time[index])
            hourly.windSpeed10m.append(wind)
            hourly.cloudCover.append(Int(cloud.rounded()))
            hourly.cloudCoverLow.append(Int(low.rounded()))
            hourly.cloudCoverMid.append(Int(mid.rounded()))
            hourly.cloudCoverHigh.append(Int(high.rounded()))
            hourly.relativeHumidity2m.append(Int(humidity.rounded()))
        }

        guard !hourly.time.isEmpty else {
            throw WeatherServiceError.noData
        }

        let timezone = response.timezone.flatMap { TimeZone(identifier: $0)?.identifier }
            ?? TimeZone.current.identifier

        return WeatherForecast(
            latitude: latitude,
            longitude: longitude,
            timezone: timezone,
            hourly: hourly,
            fetchedAt: Date().timeIntervalSince1970
        )
    }

    private static func fetchWithRetry(url: URL) async throws -> Data {
        var lastError: Error = WeatherServiceError.networkError("Weather request failed")

        for attempt in 0...retryAttempts {
            if attempt > 0 {
                let delayMs = retryBaseDelayMs * UInt64(pow(2, Double(attempt - 1)))
                try await Task.sleep(nanoseconds: delayMs * 1_000_000)
            }

            let data: Data
            let response: URLResponse
            do {
                (data, response) = try await URLSession.shared.data(from: url)
            } catch let error as URLError where error.code == .cancelled {
                throw CancellationError()
            } catch is CancellationError {
                throw CancellationError()
            } catch {
                lastError = WeatherServiceError.networkError(error.localizedDescription)
                continue
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                lastError = WeatherServiceError.networkError("Invalid response")
                continue
            }

            if httpResponse.statusCode == 200 {
                return data
            }

            lastError = WeatherServiceError.requestFailed(httpResponse.statusCode)
            // Client errors (400 etc.) won't succeed on retry.
            guard retryableStatusCodes.contains(httpResponse.statusCode) else { throw lastError }
        }

        throw lastError
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
