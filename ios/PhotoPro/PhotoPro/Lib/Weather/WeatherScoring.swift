import Foundation

private let goodWeatherScore = 70
private let maxForecastMatchHours = 2

private func clamp(_ value: Double, min: Double = 0, max: Double = 100) -> Double {
    Swift.max(min, Swift.min(max, value))
}

enum WeatherScoring {
    // MARK: - Individual Scoring Functions

    static func scoreWind(_ speedKmh: Double, ideal: Double, max: Double) -> Int {
        if speedKmh <= ideal { return 100 }
        if speedKmh >= max { return 0 }
        return Int((100 - ((speedKmh - ideal) / (max - ideal)) * 100).rounded())
    }

    static func scoreHighClouds(_ cloudCoverHigh: Int) -> Int {
        let idealCenter: Double = 55
        return Int(clamp(100 - abs(Double(cloudCoverHigh) - idealCenter) * 2).rounded())
    }

    static func scoreHumidity(_ relativeHumidity: Int) -> Int {
        let ideal: Double = 65
        let max: Double = 95
        let humidity = Double(relativeHumidity)
        if humidity <= ideal { return 100 }
        if humidity >= max { return 0 }
        return Int((100 - ((humidity - ideal) / (max - ideal)) * 100).rounded())
    }

    // MARK: - Profile Scoring

    static func scoreSunsetConditions(_ weather: HourlyWeather) -> (score: Int, windScore: Int, highCloudScore: Int, blockingCloudScore: Int) {
        let windScore = scoreWind(weather.windSpeed, ideal: 9, max: 14)
        let highCloudScore = scoreHighClouds(weather.cloudCoverHigh)
        let blockingCloudScore = 100 - Swift.max(weather.cloudCoverLow, weather.cloudCoverMid)

        let score = Int((Double(windScore) * 0.4 + Double(highCloudScore) * 0.3 + Double(blockingCloudScore) * 0.3).rounded())
        return (score, windScore, highCloudScore, blockingCloudScore)
    }

    /// Night profile. The moon sub-score is always included: when no illumination is passed,
    /// it is computed for the scored hour (ALGORITHM.md → "Weather Scoring").
    static func scoreNightConditions(_ weather: HourlyWeather, moonIllumination: Double? = nil) -> (score: Int, windScore: Int, clearSkyScore: Int, humidityScore: Int, moonScore: Int) {
        let windScore = scoreWind(weather.windSpeed, ideal: 8, max: 12)
        let clearSkyScore = 100 - weather.cloudCover
        let humidityScore = scoreHumidity(weather.humidity)
        let illumination = moonIllumination ?? MoonCalculator.illuminationPercent(at: weather.time)
        let moonScore = Int(clamp(100 - illumination).rounded())

        let score = Int((Double(windScore) * 0.3 + Double(clearSkyScore) * 0.4 + Double(humidityScore) * 0.15 + Double(moonScore) * 0.15).rounded())
        return (score, windScore, clearSkyScore, humidityScore, moonScore)
    }

    // MARK: - Labels & Icons

    static func getScoreLabel(_ score: Int) -> String {
        if score >= 85 { return "Excellent" }
        if score >= goodWeatherScore { return "Good" }
        if score >= 50 { return "Fair" }
        return "Poor"
    }

    static func getScoreIcon(_ score: Int) -> String {
        if score >= 85 { return "sun.max.fill" }
        if score >= goodWeatherScore { return "cloud.sun.fill" }
        if score >= 50 { return "cloud.fill" }
        return "cloud.fog.fill"
    }

    // MARK: - Summaries

    static func summarizeSunset(windScore: Int, highCloudScore: Int, blockingCloudScore: Int) -> String {
        if blockingCloudScore < 45 { return "Low/mid clouds may block color" }
        if highCloudScore >= 75 && windScore >= 70 { return "Light wind, ideal red-sky setup" }
        if windScore < 50 { return "Wind may shake long-lens sunset shots" }
        return "Mixed sunset conditions"
    }

    static func summarizeNight(clearSkyScore: Int, windScore: Int, humidityScore: Int) -> String {
        if clearSkyScore < 55 { return "Clouds likely limit night visibility" }
        if windScore < 55 { return "Wind may blur long exposures" }
        if humidityScore < 50 { return "Humidity may reduce sharpness" }
        return "Clear and stable for long exposures"
    }

    // MARK: - Full Scoring

    static func scoreWeatherConditions(profile: WeatherProfile, weather: HourlyWeather, moonIllumination: Double? = nil) -> ScoredConditions {
        if profile == .sunset {
            let (score, windScore, highCloudScore, blockingCloudScore) = scoreSunsetConditions(weather)
            return ScoredConditions(
                profile: .sunset,
                score: score,
                windScore: windScore,
                cloudScore: highCloudScore,
                humidityScore: 0,
                moonScore: 0,
                rating: getScoreLabel(score),
                summary: summarizeSunset(windScore: windScore, highCloudScore: highCloudScore, blockingCloudScore: blockingCloudScore),
                windSpeed: weather.windSpeed,
                cloudCover: weather.cloudCover,
                humidity: weather.humidity
            )
        } else {
            let (score, windScore, clearSkyScore, humidityScore, moonScore) = scoreNightConditions(weather, moonIllumination: moonIllumination)
            return ScoredConditions(
                profile: .night,
                score: score,
                windScore: windScore,
                cloudScore: clearSkyScore,
                humidityScore: humidityScore,
                moonScore: moonScore,
                rating: getScoreLabel(score),
                summary: summarizeNight(clearSkyScore: clearSkyScore, windScore: windScore, humidityScore: humidityScore),
                windSpeed: weather.windSpeed,
                cloudCover: weather.cloudCover,
                humidity: weather.humidity
            )
        }
    }

    // MARK: - Forecast Matching

    /// The forecast hour closest to `targetTime`, if within 2 hours.
    static func findClosestForecastHour(forecast: WeatherForecast, targetTime: Date) -> HourlyWeather? {
        let target = targetTime.timeIntervalSince1970
        var bestIndex: Int?
        var bestDiff: TimeInterval = .infinity

        for index in 0..<forecast.hourly.count {
            let diff = abs(forecast.hourly.time[index] - target)
            if diff < bestDiff {
                bestDiff = diff
                bestIndex = index
            }
        }

        guard let bestIndex, bestDiff <= Double(maxForecastMatchHours) * 3600 else { return nil }
        return forecast.point(at: bestIndex)
    }

    static func getScoreForTime(forecast: WeatherForecast, time: Date, profile: WeatherProfile, moonIllumination: Double? = nil) -> ScoredConditions? {
        guard let weather = findClosestForecastHour(forecast: forecast, targetTime: time) else { return nil }
        return scoreWeatherConditions(profile: profile, weather: weather, moonIllumination: moonIllumination)
    }

    // MARK: - Daily Photo Scores

    /// Candidate profile for a location-local hour: sunset 16:00–22:00, night 23:00 and 00:00–04:00.
    static func candidateProfile(forLocalHour hour: Int) -> WeatherProfile? {
        if (16...22).contains(hour) { return .sunset }
        if hour == 23 || (0...4).contains(hour) { return .night }
        return nil
    }

    /// Best candidate per location-local day (at most 7), with the 24 h trend
    /// (same profile at observation time + 24 h; ALGORITHM.md → "Daily photo score" / "Trend indicator").
    static func buildDailyPhotoScores(_ forecast: WeatherForecast) -> [DailyPhotoScore] {
        let timeZone = forecast.timeZone
        let calendar = AstroDateHelper.calendar(for: timeZone)

        // Group hours by local day, keeping chronological order.
        var dayKeys: [String] = []
        var byDay: [String: [HourlyWeather]] = [:]
        for point in forecast.points.sorted(by: { $0.time < $1.time }) {
            let dayKey = Formatting.string(from: point.time, pattern: "yyyy-MM-dd", timeZone: timeZone)
            if byDay[dayKey] == nil { dayKeys.append(dayKey) }
            byDay[dayKey, default: []].append(point)
        }

        var results: [DailyPhotoScore] = []

        for dayKey in dayKeys.sorted().prefix(7) {
            guard let points = byDay[dayKey], let first = points.first else { continue }

            var candidates: [(profile: WeatherProfile, weather: HourlyWeather)] = points.compactMap { point in
                let hour = calendar.component(.hour, from: point.time)
                return candidateProfile(forLocalHour: hour).map { ($0, point) }
            }
            if candidates.isEmpty {
                candidates = [(.sunset, first)]
            }

            var best: (profile: WeatherProfile, weather: HourlyWeather, scored: ScoredConditions)?
            for candidate in candidates {
                let scored = scoreWeatherConditions(profile: candidate.profile, weather: candidate.weather)
                if best == nil || scored.score > (best?.scored.score ?? 0) {
                    best = (candidate.profile, candidate.weather, scored)
                }
            }
            guard let best else { continue }

            var trend: ScoreTrend?
            var trendDelta: Int?
            let nextTime = best.weather.time.addingTimeInterval(24 * 3600)
            if let next = getScoreForTime(forecast: forecast, time: nextTime, profile: best.profile) {
                let delta = next.score - best.scored.score
                trendDelta = delta
                if delta >= 10 {
                    trend = .improving
                } else if delta <= -10 {
                    trend = .declining
                } else {
                    trend = .steady
                }
            }

            results.append(DailyPhotoScore(
                date: dayKey,
                displayDate: first.time,
                bestTime: best.weather.time,
                bestProfile: best.profile,
                score: best.scored.score,
                conditions: best.scored,
                trend: trend,
                trendDelta: trendDelta
            ))
        }

        return results
    }

    static func isGoodWeather(_ score: Int) -> Bool {
        score >= goodWeatherScore
    }
}
