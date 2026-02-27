import Foundation

/// Date normalization helpers for SunCalc.
///
/// The Swift SunCalc port (Timac/SunCalc) has a critical timezone behaviour:
///
/// - `SunCalc.getTimes()` (sun rise/set) uses Julian day arithmetic. When you
///   pass **local midnight**, the resulting UTC timestamp can land on the
///   previous solar day for westward timezones (e.g. Azores UTC-1 local
///   midnight = 01:00 UTC, which resolves to yesterday's sunrise/sunset).
///
/// - `SunCalc.getMoonTimes()` in the **Swift** version does NOT normalise
///   its input date (unlike the JS version which calls `setHours(0,0,0,0)`).
///   It scans 24 h forward from whatever time you provide.
///
/// **Rule**: always use the helpers below when passing dates to SunCalc so
/// that sun and moon calculations agree on the same calendar day.
enum AstroDateHelper {

    // MARK: - Shared UTC calendar (avoids allocating one on every call)

    private static let utcCalendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal
    }()

    // MARK: - Public API

    /// Noon UTC for the **local** calendar day of `date`.
    ///
    /// Use this when calling `SunCalc.getTimes()` so the Julian-day
    /// calculation always resolves to the correct solar day.
    static func noonUTC(for date: Date) -> Date {
        let local = Calendar.current
        let comps = local.dateComponents([.year, .month, .day], from: date)
        var noon = DateComponents()
        noon.year = comps.year
        noon.month = comps.month
        noon.day = comps.day
        noon.hour = 12
        noon.minute = 0
        noon.second = 0
        return utcCalendar.date(from: noon) ?? date
    }

    /// Local midnight for `date`.
    ///
    /// Use this when calling `SunCalc.getMoonTimes()` (Swift version) so
    /// the 24-hour scan starts at the beginning of the local day.
    static func localMidnight(for date: Date) -> Date {
        Calendar.current.startOfDay(for: date)
    }

    /// Advance a noon-UTC anchor by `days` calendar days (stays at noon UTC).
    static func addDaysNoonUTC(_ days: Int, to anchor: Date) -> Date? {
        utcCalendar.date(byAdding: .day, value: days, to: anchor)
    }

    /// Advance a local-midnight anchor by `days` calendar days (stays at local midnight).
    static func addDaysLocalMidnight(_ days: Int, to anchor: Date) -> Date? {
        Calendar.current.date(byAdding: .day, value: days, to: anchor)
    }
}
