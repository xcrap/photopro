# PhotoPro

A photographer-focused astronomy app for planning shoots around sun, moon, weather, and celestial events. Available as a web app and a native iOS app.

## Platforms

| Platform | Stack | Directory |
|----------|-------|-----------|
| **Web** | React 19 + TypeScript + Vite + Tailwind + shadcn/ui | `web/` |
| **iOS** | Swift 6 + SwiftUI (iOS 26+) | `ios/` |

## Features

- **Sun & Golden Hour** — sunrise, sunset, golden/blue hour windows, sun position
- **Moon Phases & Events** — current phase, full moon calendar, supermoons, blue/black moons
- **Photo Opportunities** — moon/sun proximity events with azimuth and timing scoring
- **Eclipse Tracking** — solar and lunar eclipses with location-based visibility
- **Night Sky** — meteor showers with ZHR ratings, comet tracking
- **Weather Forecast** — 7-day photo scoring (sunset and night profiles), trends
- **Dashboard** — at-a-glance summary with countdown to next event

## Shared Algorithms

Both platforms implement the same prediction and scoring logic, documented in [`ALGORITHM.md`](ALGORITHM.md). This is the single source of truth for:

- Weather photo scoring (sunset/night profiles, thresholds, weights)
- Proximity finder (moon/sun alignment detection)
- Next event countdown
- Full moon detection, special events (supermoon, blue moon, black moon)
- Visibility ratings (altitude-based)
- Meteor shower and comet scoring
- Eclipse visibility

## Data Sources

- **Astronomy**: SunCalc library (client-side calculations)
- **Weather**: [Open-Meteo](https://open-meteo.com/) (free, no API key)
- **Eclipses / Meteors / Comets / Supermoons**: Bundled JSON datasets

## Development

### Web
```bash
cd web
bun install
bun run dev
```

### iOS
1. Open `ios/PhotoPro/PhotoPro.xcodeproj` in Xcode
2. Build and run on simulator or device (iOS 26+)

## License

MIT
