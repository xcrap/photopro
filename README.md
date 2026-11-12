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
- **Map planner** — Sun or Moon view: rise/set directions, today's path across the sky and where it is now, drawn on a map; place search
- **Real horizon** — when the sun and moon actually clear the surrounding terrain (open elevation data)

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

- **Astronomy**: SunCalc (rise/set, positions, illumination) plus a Meeus ch. 47 moon ephemeris (full/new moon instants, moon distance, supermoons), all client-side
- **Weather**: [Open-Meteo](https://open-meteo.com/) (free, no API key); also supplies each location's time zone
- **Eclipses / Meteors / Comets**: Bundled JSON datasets

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

### TestFlight updates

Run `./ios/scripts/testflight.sh` from the repository root on this Mac. It archives
the iOS app and uploads an internal TestFlight build using the local Apple
Distribution certificate. Xcode manages the uploaded build number. No connected
iPhone or open Xcode window is needed; the Mac still needs Xcode, its signed-in
Apple account, and the distribution certificate in the keychain.

After Apple finishes processing, the Personal Testing group receives the build.
On iPhone, open PhotoPro in TestFlight and enable Automatic Updates. Each build
expires after 90 days, so upload a fresh build before then.

Release artifacts are saved in the ignored `ios/build/TestFlight/` directory.
Cloud signing is not used because this team's accented name triggered invalid
signatures in Xcode Cloud; see [Apple's signing discussion](https://developer.apple.com/forums/thread/843700).

## License

MIT
