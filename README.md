# PhotoPro

PhotoPro is a photographer-focused astronomy app for planning shoots around sun, moon, weather, and special events.

## Stack
- React 19 + TypeScript 5.9 + Vite 7 + Bun
- Tailwind CSS v4 + shadcn/ui
- Zustand (persisted stores)
- SunCalc + date-fns

## Main Features
- Dashboard with sun/moon summary, upcoming events, and best weather days.
- Live countdown for the next photography-relevant event.
- Moon module: current phase, full moons, proximity opportunities, eclipses, special events.
- Sun module: times, photography windows, eclipses.
- Weather module: 7-day photo forecast with condition scoring, trends, and visual badges.

## Weather Scoring Rules

Weather scoring lives in `src/lib/weather/scoring.ts`.

### Sunset profile
- `windScore` (ideal <= 9 km/h, max >= 14 km/h)
- `highCloudScore` (best around ~55% high cloud)
- `blockingCloudScore = 100 - max(lowCloud, midCloud)`
- Final score:
  - `0.4 * windScore + 0.3 * highCloudScore + 0.3 * blockingCloudScore`

### Night profile
- `windScore` (ideal <= 8 km/h, max >= 12 km/h)
- `clearSkyScore = 100 - cloud_cover`
- `humidityScore` (ideal <= 65%, max >= 95%)
- `moonScore = 100 - moonIllumination` (if available)
- Final score:
  - `0.3 * windScore + 0.4 * clearSkyScore + 0.15 * humidityScore + 0.15 * moonScore`

### Labels
- `Excellent`: >= 85
- `Good`: >= 70
- `Fair`: >= 50
- `Poor`: < 50

### Opportunity ranking
- Astronomy score:
  - `0.6 * azimuthAlignment + 0.4 * timingAlignment`
- Combined score:
  - `0.5 * astronomy + 0.5 * weather`

### Trend indicator
- Weather cards show 24h trend:
  - `↗ improving`, `↘ getting worse`, or `→ steady`
- Computed from score delta against the same profile/time 24h later.

## Countdown Logic

Countdown logic lives in:
- `src/lib/astronomy/countdown.ts`
- `src/hooks/useNextEvent.ts`

Events considered:
- Morning blue hour
- Sunrise
- Morning golden hour
- Evening golden hour
- Sunset
- Evening blue hour
- Moonrise (if available)
- Moonset (if available)

The countdown updates every 30s and appears in "Best Days This Week" on Home.

## Data + Caching
- Weather source: Open-Meteo hourly forecast (`src/lib/weather/api.ts`)
- Weather cache: localStorage (`src/lib/weather/cache.ts`)
- Weather cache TTL: 3 hours (`src/stores/weather-store.ts`)

## Location Behavior
- GPS-first, manual fallback.
- Manual/saved selection disables GPS mode to prevent overwrite.
- Coordinate input accepts both comma and dot decimal separators.

## Development

### Install
```bash
bun install
```

### Run
```bash
bun run dev
```

### Build
```bash
bun run build
```

### Lint
```bash
bun run lint
```

## Project Structure
- `src/features/` - route-level UI modules
- `src/lib/astronomy/` - pure astronomy/calculation utilities
- `src/lib/weather/` - weather API, cache, scoring
- `src/stores/` - Zustand state (location, settings, weather)
- `src/data/` - eclipse/supermoon datasets
