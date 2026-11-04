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
                breakdown: [
                    ScoreComponent(label: "Wind", value: windScore),
                    ScoreComponent(label: "High clouds", value: highCloudScore),
                    ScoreComponent(label: "Low/mid clear", value: blockingCloudScore),
                ],
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
                breakdown: [
                    ScoreComponent(label: "Clear sky", value: clearSkyScore),
                    ScoreComponent(label: "Wind", value: windScore),
                    ScoreComponent(label: "Humidity", value: humidityScore),
                    ScoreComponent(label: "Moon darkness", value: moonScore),
                ],
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

    /// Candidate windows for local date `day` (ALGORITHM.md → "Daily photo score"), from the real
    /// sun times of that date at the forecast's coordinates in the location time zone.
    /// - Sunset: `sunset − 90 min ≤ h ≤ sunset + 60 min` (none without a sunset).
    /// - Night: `dusk(D) ≤ h < dawn(D + 1)`. Without dusk: 18:00 if the noon sun is below −6°
    ///   (deep polar night), otherwise none (white night). Without dawn(D + 1): until 06:00 D + 1.
    static func candidateWindows(
        day: Date, latitude: Double, longitude: Double, timeZone: TimeZone
    ) -> (sunset: ClosedRange<Date>?, night: Range<Date>?) {
        let calendar = AstroDateHelper.calendar(for: timeZone)
        let dayStart = AstroDateHelper.localMidnight(for: day, in: timeZone)
        let nextDay = AstroDateHelper.addDays(1, to: dayStart, in: timeZone)

        let today = SunCalculator.getSunTimes(date: dayStart, lat: latitude, lon: longitude, timeZone: timeZone)
        let tomorrow = SunCalculator.getSunTimes(date: nextDay, lat: latitude, lon: longitude, timeZone: timeZone)

        let sunsetWindow = today.sunset.map {
            $0.addingTimeInterval(-90 * 60)...$0.addingTimeInterval(60 * 60)
        }

        let nightStart: Date?
        if let dusk = today.dusk {
            nightStart = dusk
        } else {
            let noon = today.solarNoon ?? AstroDateHelper.localNoon(for: dayStart, in: timeZone)
            let noonAltitude = SunCalculator.getSunPosition(date: noon, lat: latitude, lon: longitude).altitude
            nightStart = noonAltitude < -6
                ? calendar.date(bySettingHour: 18, minute: 0, second: 0, of: dayStart)
                : nil
        }
        let nightEnd = tomorrow.dawn ?? calendar.date(bySettingHour: 6, minute: 0, second: 0, of: nextDay)

        var nightWindow: Range<Date>?
        if let nightStart, let nightEnd, nightStart < nightEnd {
            nightWindow = nightStart..<nightEnd
        }
        return (sunsetWindow, nightWindow)
    }

    /// Best candidate per local date (at most 7, in date order), with the 24 h trend
    /// (same profile at observation time + 24 h; ALGORITHM.md → "Daily photo score" / "Trend indicator").
    /// Hours after midnight count for the previous evening's night. Candidate hours before the start
    /// of the current hour are skipped, and dates left without candidates are omitted.
    static func buildDailyPhotoScores(_ forecast: WeatherForecast, now: Date = Date()) -> [DailyPhotoScore] {
        let timeZone = forecast.timeZone
        let calendar = AstroDateHelper.calendar(for: timeZone)
        let points = forecast.points.sorted { $0.time < $1.time }
        guard !points.isEmpty else { return [] }

        let currentHourStart = calendar.dateInterval(of: .hour, for: now)?.start ?? now

        // Every local date that appears in the forecast.
        var days: [Date] = []
        for point in points {
            let dayStart = AstroDateHelper.localMidnight(for: point.time, in: timeZone)
            if days.last != dayStart { days.append(dayStart) }
        }
        // Hours before dawn on the first date belong to the previous evening's night ("tonight").
        if let first = days.first, let previous = calendar.date(byAdding: .day, value: -1, to: first) {
            days.insert(AstroDateHelper.localMidnight(for: previous, in: timeZone), at: 0)
        }

        var results: [DailyPhotoScore] = []

        for day in days {
            guard results.count < 7 else { break }

            let windows = candidateWindows(day: day, latitude: forecast.latitude, longitude: forecast.longitude, timeZone: timeZone)
            var candidates: [(profile: WeatherProfile, weather: HourlyWeather)] = []
            for point in points where point.time >= currentHourStart {
                if let sunset = windows.sunset, sunset.contains(point.time) {
                    candidates.append((.sunset, point))
                }
                if let night = windows.night, night.contains(point.time) {
                    candidates.append((.night, point))
                }
            }
            guard !candidates.isEmpty else { continue }

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
                date: Formatting.string(from: day, pattern: "yyyy-MM-dd", timeZone: timeZone),
                displayDate: day,
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
