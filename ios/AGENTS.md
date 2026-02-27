# PhotoPro iOS

> **CLAUDE.md** is a symlink to this file.

## Tech Stack
- Swift 5.10+ / SwiftUI (iOS 17+) / Xcode 16+
- Timac/SunCalc — local fork at `SunCalc/` (precision fix: `π = Double.pi`)
- `@Observable` + UserDefaults persistence
- URLSession async/await (Open-Meteo weather API)
- CoreLocation for GPS

## Architecture
- Models: `PhotoPro/PhotoPro/Models/` — Swift structs
- Stores: `PhotoPro/PhotoPro/Stores/` — `@Observable` classes, injected via `.environment()`
- Lib: `PhotoPro/PhotoPro/Lib/Astronomy/` and `Lib/Weather/` — pure calculations (must match `ALGORITHM.md`)
- Views: `PhotoPro/PhotoPro/Views/` — feature screens (Home, Weather, Sun, Moon, Night, Settings)
- Theme: `PhotoPro/PhotoPro/Theme/` — colors, fonts, spacing, surface modifiers
- Data: `PhotoPro/PhotoPro/Data/` — bundled JSON (eclipses, supermoons, meteors, comets)

## ⚠️ SunCalc Date Normalization (CRITICAL)

The Swift SunCalc port has a timezone-dependent bug. **Always use `AstroDateHelper`** when calling SunCalc.

| SunCalc method | Date to pass | Helper |
|---|---|---|
| `getTimes()` | Noon UTC | `AstroDateHelper.noonUTC(for:)` |
| `getMoonTimes()` | Local midnight | `AstroDateHelper.localMidnight(for:)` |
| `getSunPosition()` | Exact timestamp | — |
| `getMoonPosition()` | Exact timestamp | — |
| `getMoonIllumination()` | Exact timestamp | — |

## Key Patterns
- `enum` for namespace-like groupings (e.g., `SunCalculator`, `Formatting`)
- Models are `struct`, stores are `@Observable class`
- Prefer computed properties over stored state for derived data
- `.surfaceCard(accent:)` modifier for glassmorphism cards
- `Theme.` constants for all colors, spacing, and fonts
- JSON data loaded from `Bundle.main` with caching
- Dark theme forced via `.preferredColorScheme(.dark)`
- 5-tab `TabView` + NavigationStack per tab
- SF Symbols for all icons
