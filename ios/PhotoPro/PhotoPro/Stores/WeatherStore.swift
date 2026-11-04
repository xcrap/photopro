import Foundation
import Observation

private let cacheTTL: TimeInterval = 3 * 60 * 60 // 3 hours
private let maxCachedLocations = 10
private let cacheStorageKey = "photopro-weather-cache-v2"
private let legacyCacheStorageKeys = ["photopro-weather-cache-v1"]

/// Weather forecast for the **current** location (ALGORITHM.md → "Weather Data Source").
///
/// - Cache key = the requested coordinates rounded to 3 decimals; at most 10 locations kept.
/// - Responses for a location that is no longer current are cached but not shown.
@MainActor
@Observable
final class WeatherStore {
    private(set) var forecast: WeatherForecast?
    private(set) var dailyScores: [DailyPhotoScore] = []
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var lastUpdated: Date?

    /// Cache key of the location whose forecast this store represents.
    @ObservationIgnored private var currentKey: String?
    /// Cache key of the request in flight, if any.
    @ObservationIgnored private var inFlightKey: String?

    /// Loads the cached forecast (any age) for the starting location only.
    init(latitude: Double? = nil, longitude: Double? = nil) {
        for key in legacyCacheStorageKeys {
            UserDefaults.standard.removeObject(forKey: key)
        }
        if let latitude, let longitude {
            let key = LocationKey.make(latitude: latitude, longitude: longitude)
            currentKey = key
            if let cached = Self.readCache()[key] {
                apply(cached)
            }
        }
    }

    // MARK: - Cache

    private static func readCache() -> [String: WeatherForecast] {
        guard let data = UserDefaults.standard.data(forKey: cacheStorageKey),
              let cache = try? JSONDecoder().decode([String: WeatherForecast].self, from: data) else {
            return [:]
        }
        return cache
    }

    private static func writeCache(_ forecast: WeatherForecast) {
        var cache = readCache()
        cache[forecast.cacheKey] = forecast

        // Keep the 10 most recently fetched locations.
        if cache.count > maxCachedLocations {
            let keep = cache
                .sorted { $0.value.fetchedAt > $1.value.fetchedAt }
                .prefix(maxCachedLocations)
            cache = Dictionary(uniqueKeysWithValues: keep.map { ($0.key, $0.value) })
        }

        if let data = try? JSONEncoder().encode(cache) {
            UserDefaults.standard.set(data, forKey: cacheStorageKey)
        }
    }

    private func apply(_ forecast: WeatherForecast) {
        self.forecast = forecast
        dailyScores = WeatherScoring.buildDailyPhotoScores(forecast)
        lastUpdated = Date(timeIntervalSince1970: forecast.fetchedAt)
    }

    private func clearForecast() {
        forecast = nil
        dailyScores = []
        lastUpdated = nil
    }

    /// Switch to a location: show its cached forecast (any age) or nothing — never another location's.
    private func switchLocation(to key: String) {
        guard key != currentKey else { return }
        currentKey = key
        error = nil
        if let cached = Self.readCache()[key] {
            apply(cached)
        } else {
            clearForecast()
        }
    }

    // MARK: - Fetch

    /// Fetch the forecast for the current location. Uses the cache when it is younger than 3 h
    /// unless `force` is set. Call whenever the location changes.
    func fetchForecast(latitude: Double, longitude: Double, force: Bool = false) async {
        let key = LocationKey.make(latitude: latitude, longitude: longitude)
        switchLocation(to: key)

        if !force, let forecast, forecast.cacheKey == key,
           Date().timeIntervalSince1970 - forecast.fetchedAt <= cacheTTL {
            error = nil
            // Re-score so candidate hours that have passed drop out.
            dailyScores = WeatherScoring.buildDailyPhotoScores(forecast)
            return
        }

        // Don't start a duplicate request for the same location.
        if inFlightKey == key && !force { return }

        inFlightKey = key
        isLoading = true
        defer {
            if inFlightKey == key {
                inFlightKey = nil
                isLoading = false
            }
        }

        do {
            let result = try await WeatherService.fetchForecast(latitude: latitude, longitude: longitude)
            Self.writeCache(result)

            // Ignore responses for a location that is no longer current.
            guard key == currentKey else { return }
            apply(result)
            error = nil
        } catch is CancellationError {
            return
        } catch {
            guard key == currentKey else { return }
            if let forecast, forecast.cacheKey == key {
                self.error = "Live weather unavailable. Showing older cached forecast."
            } else {
                self.error = error.localizedDescription
            }
        }
    }

    // MARK: - Score Helpers

    /// Weather score at `time`. For the night profile the moon illumination is computed for the
    /// matched hour when not passed.
    func getScoreForTime(_ time: Date, profile: WeatherProfile, moonIllumination: Double? = nil) -> ScoredConditions? {
        guard let forecast else { return nil }
        return WeatherScoring.getScoreForTime(forecast: forecast, time: time, profile: profile, moonIllumination: moonIllumination)
    }

    func getTopDays(count: Int) -> [DailyPhotoScore] {
        Array(
            dailyScores
                .filter { $0.score >= 70 }
                .sorted { $0.score > $1.score }
                .prefix(count)
        )
        .sorted { $0.displayDate < $1.displayDate }
    }
}
