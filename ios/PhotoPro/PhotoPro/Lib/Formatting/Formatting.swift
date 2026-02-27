import Foundation

enum Formatting {
    // MARK: - Time Formatting

    static func formatTime(_ date: Date, format: TimeFormat) -> String {
        let formatter = DateFormatter()
        switch format {
        case .twelveHour:
            formatter.dateFormat = "h:mm a"
        case .twentyFourHour:
            formatter.dateFormat = "H:mm"
        }
        return formatter.string(from: date)
    }

    // MARK: - Date Formatting

    static func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }

    static func formatDateShort(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    // MARK: - Number Formatting

    static func formatDegrees(_ degrees: Double) -> String {
        String(format: "%.1f\u{00B0}", degrees)
    }

    static func formatDistance(_ km: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = ","
        formatter.maximumFractionDigits = 0
        let formatted = formatter.string(from: NSNumber(value: km)) ?? "\(Int(km))"
        return "\(formatted) km"
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

    static func formatAzimuthDirection(_ azimuth: Double) -> String {
        let normalized = ((azimuth.truncatingRemainder(dividingBy: 360)) + 360)
            .truncatingRemainder(dividingBy: 360)
        let index = Int((normalized / 45).rounded()) % 8
        return directions8[index]
    }

    private static let directions16 = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
    ]

    static func compassDirection(_ azimuth: Double) -> String {
        let index = Int((azimuth / 22.5).rounded()) % 16
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

    static func formatDaysUntil(_ date: Date, from: Date = Date()) -> String {
        let days = Calendar.current.dateComponents([.day], from: from, to: date).day ?? 0
        if days == 0 { return "Today" }
        if days == 1 { return "Tomorrow" }
        return "in \(days)d"
    }
}
