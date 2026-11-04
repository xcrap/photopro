# PhotoPro iOS

> **CLAUDE.md** is a symlink to this file.

## Tech Stack
- Swift 6 / SwiftUI (iOS 26+) / Xcode 26+
- Timac/SunCalc — local fork at `SunCalc/` (precision fix: `π = Double.pi`; moon refraction = JS suncalc 1.9 `astroRefraction`; `MoonPosition.parallacticAngle`)
- `@Observable` + UserDefaults persistence
- URLSession async/await (Open-Meteo weather API)
- CoreLocation for GPS

## Architecture
- Models: `PhotoPro/PhotoPro/Models/` — Swift structs
- Stores: `PhotoPro/PhotoPro/Stores/` — `@Observable` classes, injected via `.environment()`
- Lib: `PhotoPro/PhotoPro/Lib/Astronomy/` and `Lib/Weather/` — pure calculations (must match `ALGORITHM.md`)
- Views: `PhotoPro/PhotoPro/Views/` — feature screens (Home, Weather, Sun, Moon, Night, Settings)
- Theme: `PhotoPro/PhotoPro/Theme/` — colors, fonts, spacing, surface modifiers
- Data: `PhotoPro/PhotoPro/Data/` — bundled JSON (eclipses, meteors, comets). Supermoons are computed (Meeus ephemeris), not bundled

## ⚠️ Time Zones & SunCalc Date Normalization (CRITICAL)

All local days and displayed times use the **location's** time zone (`LocationStore.timeZone`: the IANA
zone from the Open-Meteo forecast, falling back to the device's). Never use `Calendar.current`,
`TimeZone.current` or an unpinned `DateFormatter` — use `AstroDateHelper.calendar(for:)` and
`Formatting.*(…, timeZone:)` (en_US_POSIX, Gregorian, explicit time zone).

| SunCalc method | Date to pass | Helper |
|---|---|---|
| `getTimes()` | 12:00 local (location tz) | `AstroDateHelper.localNoon(for:in:)` |
| `getMoonTimes()` | Local midnight (location tz) | `AstroDateHelper.localMidnight(for:in:)` |
| `getSunPosition()` | Exact timestamp | — |
| `getMoonPosition()` | Exact timestamp | — |
| `getMoonIllumination()` | Exact timestamp | — |

Polar day/night events are `nil` — never substitute another time. Moon distance and full/new moon
instants come from `MoonEphemeris` (Meeus ch. 47), not SunCalc.

## Key Patterns
- `enum` for namespace-like groupings (e.g., `SunCalculator`, `Formatting`)
- Models are `struct`, stores are `@MainActor @Observable final class` (Swift 6 language mode)
- Prefer computed properties over stored state for derived data
- `.surfaceCard(accent:)` modifier for glassmorphism cards
- `Theme.` constants for all colors, spacing, and fonts
- JSON data loaded from `Bundle.main` with caching
- Dark theme forced via `.preferredColorScheme(.dark)`
- 5-tab `TabView` + NavigationStack per tab
- SF Symbols for all icons
