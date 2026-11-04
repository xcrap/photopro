import Foundation

/// Day-boundary helpers in the **location** time zone (ALGORITHM.md → "Time Zones & Day Boundaries").
///
/// Always use these when passing dates to SunCalc:
///
/// - `SunCalc.getTimes()` returns the solar day nearest the instant it is given, so pass
///   **12:00 local time** (`localNoon`). Local midnight or an arbitrary time can resolve to the
///   previous or next day (e.g. Samoa/Tonga with noon UTC).
/// - `SunCalc.getMoonTimes()` (Swift port) scans 24 h forward from whatever instant it is given,
///   so pass **local midnight** (`localMidnight`).
///
/// Every calendar here is Gregorian with a POSIX locale, never `Calendar.current`, which can be
/// Buddhist or Japanese and which uses the device time zone.
enum AstroDateHelper {

    /// Gregorian calendar in UTC.
    static let utcCalendar: Calendar = calendar(for: TimeZone(identifier: "UTC") ?? .gmt)

    /// Gregorian, POSIX-locale calendar pinned to `timeZone`.
    static func calendar(for timeZone: TimeZone) -> Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        cal.locale = Locale(identifier: "en_US_POSIX")
        return cal
    }

    /// 12:00 local time on the local day containing `date`. Pass this to `SunCalc.getTimes()`.
    static func localNoon(for date: Date, in timeZone: TimeZone) -> Date {
        let cal = calendar(for: timeZone)
        let start = cal.startOfDay(for: date)
        return cal.date(bySettingHour: 12, minute: 0, second: 0, of: start)
            ?? start.addingTimeInterval(12 * 3600)
    }

    /// Local midnight (start of the local day) for `date`. Pass this to `SunCalc.getMoonTimes()`.
    static func localMidnight(for date: Date, in timeZone: TimeZone) -> Date {
        calendar(for: timeZone).startOfDay(for: date)
    }

    /// Advance `date` by whole local calendar days (keeps the local wall-clock time across DST).
    static func addDays(_ days: Int, to date: Date, in timeZone: TimeZone) -> Date {
        calendar(for: timeZone).date(byAdding: .day, value: days, to: date)
            ?? date.addingTimeInterval(Double(days) * 86400)
    }

    /// Calendar-day difference `target − reference` in the location time zone (not 24 h periods).
    static func dayDifference(from reference: Date, to target: Date, in timeZone: TimeZone) -> Int {
        let cal = calendar(for: timeZone)
        let a = cal.startOfDay(for: reference)
        let b = cal.startOfDay(for: target)
        return cal.dateComponents([.day], from: a, to: b).day ?? 0
    }

    static func isSameDay(_ a: Date, _ b: Date, in timeZone: TimeZone) -> Bool {
        calendar(for: timeZone).isDate(a, inSameDayAs: b)
    }

    static func isToday(_ date: Date, in timeZone: TimeZone, now: Date = Date()) -> Bool {
        isSameDay(date, now, in: timeZone)
    }
}
