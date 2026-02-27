import Foundation
import Observation

private let cacheTTLMs: TimeInterval = 3 * 60 * 60 // 3 hours

@Observable
final class WeatherStore {
    var forecast: WeatherForecast?
    var dailyScores: [DailyPhotoScore] = []
    var isLoading = false
    var error: String?
    var lastUpdated: Date?

    private var inFlightKey: String?
    private var inFlightTask: Task<WeatherForecast, Error>?
    private var refreshTimer: Timer?
    private var lastLat: Double?
    private var lastLon: Double?

    // MARK: - Cache

    private let cacheKey = "photopro-weather-cache-v1"

    init() {
        // Load most recent cached forecast on startup
        if let data = UserDefaults.standard.data(forKey: cacheKey),
           let cache = try? JSONDecoder().decode([String: WeatherForecast].self, from: data),
           let mostRecent = cache.values.max(by: { $0.fetchedAt < $1.fetchedAt }) {
            forecast = mostRecent
            dailyScores = WeatherScoring.buildDailyPhotoScores(mostRecent)
            lastUpdated = Date(timeIntervalSince1970: mostRecent.fetchedAt)
        }
    }

    private func getCacheKey(lat: Double, lon: Double) -> String {
        "\(String(format: "%.3f", lat)):\(String(format: "%.3f", lon))"
    }

    private func getCachedForecast(lat: Double, lon: Double, maxAge: TimeInterval) -> WeatherForecast? {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let cache = try? JSONDecoder().decode([String: WeatherForecast].self, from: data) else {
            return nil
        }
        let key = getCacheKey(lat: lat, lon: lon)
        guard let cached = cache[key] else { return nil }
        let age = Date().timeIntervalSince1970 - cached.fetchedAt
        return age <= maxAge ? cached : nil
    }

    private func getCachedForecastAnyAge(lat: Double, lon: Double) -> WeatherForecast? {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let cache = try? JSONDecoder().decode([String: WeatherForecast].self, from: data) else {
            return nil
        }
        return cache[getCacheKey(lat: lat, lon: lon)]
    }

    private func saveForecastToCache(_ forecast: WeatherForecast) {
        var cache: [String: WeatherForecast] = [:]
        if let data = UserDefaults.standard.data(forKey: cacheKey),
           let existing = try? JSONDecoder().decode([String: WeatherForecast].self, from: data) {
            cache = existing
        }
        let key = getCacheKey(lat: forecast.latitude, lon: forecast.longitude)
        cache[key] = forecast
        if let data = try? JSONEncoder().encode(cache) {
            UserDefaults.standard.set(data, forKey: cacheKey)
        }
    }

    // MARK: - Fetch

    func fetchForecast(latitude: Double, longitude: Double, force: Bool = false) async {
        // Check cache first
        if !force, let cached = getCachedForecast(lat: latitude, lon: longitude, maxAge: cacheTTLMs) {
            // Skip reassignment if we already have this exact cached data loaded
            if forecast?.fetchedAt == cached.fetchedAt && !dailyScores.isEmpty {
                return
            }
            forecast = cached
            dailyScores = WeatherScoring.buildDailyPhotoScores(cached)
            isLoading = false
            lastUpdated = Date(timeIntervalSince1970: cached.fetchedAt)
            error = nil
            return
        }

        if forecast == nil {
            isLoading = true
        }
        error = nil

        do {
            let result = try await WeatherService.fetchForecast(latitude: latitude, longitude: longitude)
            saveForecastToCache(result)

            forecast = result
            dailyScores = WeatherScoring.buildDailyPhotoScores(result)
            isLoading = false
            error = nil
            lastUpdated = Date(timeIntervalSince1970: result.fetchedAt)
        } catch {
            // Try stale cache
            if let stale = getCachedForecastAnyAge(lat: latitude, lon: longitude) {
                forecast = stale
                dailyScores = WeatherScoring.buildDailyPhotoScores(stale)
                isLoading = false
                lastUpdated = Date(timeIntervalSince1970: stale.fetchedAt)
                self.error = "Live weather unavailable. Showing older cached forecast."
                return
            }

            isLoading = false
            self.error = error.localizedDescription
        }
    }

    // MARK: - Auto Refresh

    func startAutoRefresh(latitude: Double, longitude: Double) {
        lastLat = latitude
        lastLon = longitude

        // Don't start multiple timers
        guard refreshTimer == nil else { return }

        // Check every 30 minutes if cache has expired
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 30 * 60, repeats: true) { [weak self] _ in
            guard let self, let lat = self.lastLat, let lon = self.lastLon else { return }
            Task {
                await self.fetchForecast(latitude: lat, longitude: lon)
            }
        }
    }

    // MARK: - Score Helpers

    func getScoreForTime(_ time: Date, profile: WeatherProfile, moonIllumination: Double? = nil) -> ScoredConditions? {
        guard let forecast else { return nil }
        guard let hourlyWeather = WeatherScoring.findClosestForecastHour(forecast: forecast, targetTime: time) else { return nil }
        return WeatherScoring.scoreWeatherConditions(profile: profile, weather: hourlyWeather, moonIllumination: moonIllumination)
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
