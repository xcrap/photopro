import Foundation
import Synchronization

enum Formatting {
    // MARK: - Pinned date formatters

    /// Formatters are pinned to en_US_POSIX + Gregorian + an explicit time zone so the output never
    /// depends on the device's calendar (Buddhist, Japanese…) or 12/24 h override (QA1480).
    private static let formatterCache = Mutex<[String: DateFormatter]>([:])

    /// Format `date` with a fixed pattern in `timeZone`.
    static func string(from date: Date, pattern: String, timeZone: TimeZone) -> String {
        let key = "\(pattern)|\(timeZone.identifier)"
        return formatterCache.withLock { cache in
            let formatter: DateFormatter
            if let cached = cache[key] {
                formatter = cached
            } else {
                formatter = DateFormatter()
                formatter.locale = Locale(identifier: "en_US_POSIX")
                formatter.calendar = Calendar(identifier: .gregorian)
                formatter.timeZone = timeZone
                formatter.dateFormat = pattern
                cache[key] = formatter
            }
            return formatter.string(from: date)
        }
    }

    // MARK: - Time Formatting

    /// Time of day in the location time zone; `—` when the event is absent.
    static func formatTime(_ date: Date?, format: TimeFormat, timeZone: TimeZone) -> String {
        guard let date else { return "—" }
        switch format {
        case .twelveHour:
            return string(from: date, pattern: "h:mm a", timeZone: timeZone)
        case .twentyFourHour:
            return string(from: date, pattern: "H:mm", timeZone: timeZone)
        }
    }

    /// "start – end", or `—` when either end is absent.
    static func formatTimeRange(_ start: Date?, _ end: Date?, format: TimeFormat, timeZone: TimeZone) -> String {
        guard let start, let end else { return "—" }
        return "\(formatTime(start, format: format, timeZone: timeZone)) – \(formatTime(end, format: format, timeZone: timeZone))"
    }

    /// Short time-zone name for `date` (e.g. "WEST", "GMT-1").
    static func timeZoneAbbreviation(_ timeZone: TimeZone, at date: Date) -> String {
        timeZone.abbreviation(for: date) ?? timeZone.identifier
    }

    // MARK: - Date Formatting

    static func formatDate(_ date: Date, timeZone: TimeZone) -> String {
        string(from: date, pattern: "MMM d, yyyy", timeZone: timeZone)
    }

    static func formatDateShort(_ date: Date, timeZone: TimeZone) -> String {
        string(from: date, pattern: "MMM d", timeZone: timeZone)
    }

    static func formatWeekdayDate(_ date: Date, timeZone: TimeZone) -> String {
        string(from: date, pattern: "EEEE, MMM d", timeZone: timeZone)
    }

    /// Date + time, e.g. "Nov 4, 14:05".
    static func formatDateTime(_ date: Date, format: TimeFormat, timeZone: TimeZone) -> String {
        "\(formatDateShort(date, timeZone: timeZone)), \(formatTime(date, format: format, timeZone: timeZone))"
    }

    // MARK: - Number Formatting

    static func formatDegrees(_ degrees: Double) -> String {
        String(format: "%.1f\u{00B0}", degrees)
    }

    static func formatDistance(_ km: Double) -> String {
        let rounded = Int(km.rounded())
        return "\(rounded.formatted(.number.locale(Locale(identifier: "en_US")))) km"
    }

    static func formatDuration(minutes: Double) -> String {
        let h = Int(minutes / 60)
        let m = Int(minutes.truncatingRemainder(dividingBy: 60).rounded())

        if h == 0 { return "\(m)m" }
        if m == 0 { return "\(h)h" }
        return "\(h)h \(m)m"
    }

    // MARK: - Direction Formatting

    private static let directions8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

    private static func normalizedAzimuth(_ azimuth: Double) -> Double {
        let r = azimuth.truncatingRemainder(dividingBy: 360)
        return r < 0 ? r + 360 : r
    }

    static func formatAzimuthDirection(_ azimuth: Double) -> String {
        let index = Int((normalizedAzimuth(azimuth) / 45).rounded()) % 8
        return directions8[index]
    }

    private static let directions16 = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
    ]

    static func compassDirection(_ azimuth: Double) -> String {
        let index = Int((normalizedAzimuth(azimuth) / 22.5).rounded()) % 16
        return directions16[index]
    }

    // MARK: - Countdown Formatting

    static func formatCountdown(seconds: Int) -> String {
        if seconds <= 0 { return "Now" }

        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        if minutes > 0 {
            return "\(minutes)m"
        }
        return "<1m"
    }

    /// "Today" / "Tomorrow" / "in Nd" by calendar-day difference in the location time zone.
    static func formatDaysUntil(_ date: Date, from: Date = Date(), timeZone: TimeZone) -> String {
        let days = AstroDateHelper.dayDifference(from: from, to: date, in: timeZone)
        switch days {
        case 0: return "Today"
        case 1: return "Tomorrow"
        case -1: return "Yesterday"
        case ..<0: return "\(-days)d ago"
        default: return "in \(days)d"
        }
    }

    /// "Today" / "Tomorrow" or a short date, by calendar day in the location time zone.
    static func formatRelativeDay(_ date: Date, from: Date = Date(), timeZone: TimeZone) -> String {
        switch AstroDateHelper.dayDifference(from: from, to: date, in: timeZone) {
        case 0: return "Today"
        case 1: return "Tomorrow"
        default: return formatDateShort(date, timeZone: timeZone)
        }
    }
}

// MARK: - ISO 8601

/// ISO 8601 parsing/formatting with Sendable format styles (no shared formatter state).
enum ISODate {
    private static let withFractional = Date.ISO8601FormatStyle(includingFractionalSeconds: true, timeZone: .gmt)
    private static let plain = Date.ISO8601FormatStyle(timeZone: .gmt)
    private static let dateOnly = Date.ISO8601FormatStyle(timeZone: .gmt).year().month().day()

    /// Parses "2026-08-12T17:46:00Z", "2026-08-12T17:46:00.000Z" or "2026-08-12" (UTC).
    static func parse(_ string: String) -> Date? {
        if let date = try? withFractional.parse(string) { return date }
        if let date = try? plain.parse(string) { return date }
        if let date = try? dateOnly.parse(string) { return date }
        return nil
    }

    /// "2026-08-12T17:46:00.000Z" — the eclipse override key format (ALGORITHM.md → "Eclipse Visibility").
    static func stringWithMilliseconds(_ date: Date) -> String {
        withFractional.format(date)
    }
}
