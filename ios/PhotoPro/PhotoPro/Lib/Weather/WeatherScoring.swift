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

    static func scoreNightConditions(_ weather: HourlyWeather, moonIllumination: Double? = nil) -> (score: Int, windScore: Int, clearSkyScore: Int, humidityScore: Int, moonScore: Int) {
        let windScore = scoreWind(weather.windSpeed, ideal: 8, max: 12)
        let clearSkyScore = 100 - weather.cloudCover
        let humidityScore = scoreHumidity(weather.humidity)
        let moonScore = moonIllumination != nil ? Int(100 - moonIllumination!) : 100

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

    static func findClosestForecastHour(forecast: WeatherForecast, targetTime: Date) -> HourlyWeather? {
        let hourly = forecast.hourly
        guard !hourly.time.isEmpty else { return nil }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm"

        let isoFormatter = ISO8601DateFormatter()

        var bestIndex = 0
        var bestDiff: TimeInterval = .infinity

        for (index, timeStr) in hourly.time.enumerated() {
            guard let date = formatter.date(from: timeStr) ?? isoFormatter.date(from: timeStr) else { continue }
            let diff = abs(date.timeIntervalSince(targetTime))
            if diff < bestDiff {
                bestDiff = diff
                bestIndex = index
            }
        }

        let maxDiffMs = Double(maxForecastMatchHours) * 3600
        guard bestDiff <= maxDiffMs else { return nil }

        let date = formatter.date(from: hourly.time[bestIndex]) ?? isoFormatter.date(from: hourly.time[bestIndex]) ?? targetTime

        return HourlyWeather(
            time: date,
            windSpeed: hourly.windSpeed10m[bestIndex],
            cloudCover: hourly.cloudCover[bestIndex],
            cloudCoverLow: hourly.cloudCoverLow[bestIndex],
            cloudCoverMid: hourly.cloudCoverMid[bestIndex],
            cloudCoverHigh: hourly.cloudCoverHigh[bestIndex],
            humidity: hourly.relativeHumidity2m[bestIndex]
        )
    }

    // MARK: - Daily Photo Scores

    static func buildDailyPhotoScores(_ forecast: WeatherForecast) -> [DailyPhotoScore] {
        let hourly = forecast.hourly
        guard !hourly.time.isEmpty else { return [] }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm"

        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "yyyy-MM-dd"

        // Group hours by day
        var byDay: [String: [(index: Int, date: Date)]] = [:]

        for (index, timeStr) in hourly.time.enumerated() {
            guard let date = formatter.date(from: timeStr) else { continue }
            let dayKey = dayFormatter.string(from: date)
            byDay[dayKey, default: []].append((index, date))
        }

        var results: [DailyPhotoScore] = []

        for (dayKey, points) in byDay {
            guard !points.isEmpty else { continue }

            // Find candidates: sunset hours (16-22) and night hours (0-4, 22-23)
            struct Candidate {
                var profile: WeatherProfile
                var index: Int
                var date: Date
            }

            var candidates: [Candidate] = []
            let calendar = Calendar.current

            for point in points {
                let hour = calendar.component(.hour, from: point.date)
                if hour >= 16 && hour <= 22 {
                    candidates.append(Candidate(profile: .sunset, index: point.index, date: point.date))
                } else if hour <= 4 || hour >= 22 {
                    candidates.append(Candidate(profile: .night, index: point.index, date: point.date))
                }
            }

            if candidates.isEmpty {
                candidates.append(Candidate(profile: .sunset, index: points[0].index, date: points[0].date))
            }

            var bestScore: ScoredConditions?
            var bestCandidate: Candidate?

            for candidate in candidates {
                let weather = HourlyWeather(
                    time: candidate.date,
                    windSpeed: hourly.windSpeed10m[candidate.index],
                    cloudCover: hourly.cloudCover[candidate.index],
                    cloudCoverLow: hourly.cloudCoverLow[candidate.index],
                    cloudCoverMid: hourly.cloudCoverMid[candidate.index],
                    cloudCoverHigh: hourly.cloudCoverHigh[candidate.index],
                    humidity: hourly.relativeHumidity2m[candidate.index]
                )

                let scored = scoreWeatherConditions(profile: candidate.profile, weather: weather)
                if bestScore == nil || scored.score > (bestScore?.score ?? 0) {
                    bestScore = scored
                    bestCandidate = candidate
                }
            }

            guard let score = bestScore, let candidate = bestCandidate else { continue }

            results.append(DailyPhotoScore(
                date: dayKey,
                displayDate: points[0].date,
                bestTime: candidate.date,
                bestProfile: candidate.profile,
                score: score.score,
                conditions: score,
                trend: .steady,
                trendDelta: 0
            ))
        }

        var sorted = results
            .sorted { $0.displayDate < $1.displayDate }
            .prefix(7)
            .map { $0 }

        // Calculate trends by comparing to previous day
        for i in 1..<sorted.count {
            let delta = sorted[i].score - sorted[i - 1].score
            if delta >= 10 {
                sorted[i].trend = .improving
            } else if delta <= -10 {
                sorted[i].trend = .declining
            } else {
                sorted[i].trend = .steady
            }
            sorted[i].trendDelta = delta
        }

        return sorted
    }

    static func isGoodWeather(_ score: Int) -> Bool {
        score >= goodWeatherScore
    }
}
