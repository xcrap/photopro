# PhotoPro — Shared Algorithm Specification

> **Canonical reference** for all prediction and scoring algorithms.
> Both `web/` (TypeScript) and `ios/` (Swift) must implement these rules identically.

## Weather Scoring

### Sub-scores

| Sub-score | Formula | Notes |
|-----------|---------|-------|
| **Wind** | `100 - ((speed - ideal) / (max - ideal)) * 100`, clamped 0–100 | Ideal/max differ per profile |
| **High cloud** | `100 - abs(cloudCoverHigh - 55) * 2` | Best around ~55% high cloud for color |
| **Blocking cloud** | `100 - max(lowCloud, midCloud)` | Low/mid clouds block the sun |
| **Clear sky** | `100 - totalCloudCover` | |
| **Humidity** | `100 - ((humidity - 65) / (95 - 65)) * 100`, clamped 0–100 | Ideal ≤ 65%, max ≥ 95% |
| **Moon** | `100 - moonIlluminationPercent` | Less moon = better night sky |

### Sunset profile

| Component | Weight | Thresholds |
|-----------|--------|------------|
| Wind | 40% | Ideal ≤ 9 km/h, max ≥ 14 km/h |
| High clouds | 30% | Best at ~55% |
| Blocking clouds | 30% | — |

**Final** = `0.4 × wind + 0.3 × highCloud + 0.3 × blockingCloud`

### Night profile

| Component | Weight | Thresholds |
|-----------|--------|------------|
| Clear sky | 40% | — |
| Wind | 30% | Ideal ≤ 8 km/h, max ≥ 12 km/h |
| Humidity | 15% | Ideal ≤ 65%, max ≥ 95% |
| Moon | 15% | — |

**Final** = `0.4 × clearSky + 0.3 × wind + 0.15 × humidity + 0.15 × moon`

### Score labels

| Label | Threshold |
|-------|-----------|
| Excellent | ≥ 85 |
| Good | ≥ 70 |
| Fair | ≥ 50 |
| Poor | < 50 |

### Trend indicator

- Compare score for the same profile/time 24 h later.
- `↗ improving`, `↘ getting worse`, `→ steady`.

### Opportunity ranking (combined score)

- Astronomy score = `0.6 × azimuthAlignment + 0.4 × timingAlignment`
- Combined score = `0.5 × astronomy + 0.5 × weather`

## Proximity Finder (Moon/Sun Photo Opportunities)

Detects when moon and sun rise/set events occur near each other — ideal for dramatic photography.

### Thresholds

| Parameter | Value |
|-----------|-------|
| Max time difference | 30 minutes |
| Max azimuth difference | 30 degrees |

### Logic

1. For each day in the scan range, compute all 4 event pairs: (moonrise, sunrise), (moonrise, sunset), (moonset, sunrise), (moonset, sunset).
2. Filter pairs where time difference ≤ 30 min AND circular azimuth difference ≤ 30°.
3. Azimuth difference uses circular math: `min(abs(a - b), 360 - abs(a - b))`.
4. Quality is scored by combining azimuth alignment and timing closeness.

## Countdown (Next Photography Event)

### Considered events

**Sun:** Blue hour AM, Sunrise, Golden hour AM, Golden hour PM, Sunset, Blue hour PM.
**Moon:** Moonrise, Moonset.
**Meteors:** Peak intensity showers (ZHR ≥ 50) within 30 days.

### Logic

1. Collect all candidate event times.
2. Filter for future events only (`time > now`).
3. Sort chronologically.
4. Return the nearest event with `secondsUntil`.
5. Updates every 30 seconds.

## Full Moon Detection

- Uses binary search on moon illumination phase to find peak full moon time.
- Target phase = 0.5 (full illumination).
- Refines to millisecond precision by comparing distance from 0.5.

## Special Moon Events

| Event | Rule |
|-------|------|
| **Supermoon** | Full moon with distance < 362,000 km (within 90% of perigee) |
| **Blue moon** | Second full moon in the same calendar month |
| **Black moon** | Second new moon in the same calendar month |

## Visibility Rating (Altitude-Based)

Used for meteor showers, comets, and eclipses.

**Max altitude** = `90 - abs(userLatitude - objectDeclination)`

| Rating | Altitude threshold |
|--------|-------------------|
| Excellent | ≥ 45° |
| Good | ≥ 25° |
| Poor | ≥ 10° |
| Not visible | < 10° |

## Meteor Showers

### ZHR star ratings

| Stars | ZHR threshold |
|-------|---------------|
| ★★★ | ≥ 100 |
| ★★ | ≥ 40 |
| ★ | < 40 |

### Visibility

Uses the altitude-based visibility rating above.

## Comets

### Magnitude ratings

| Rating | Magnitude |
|--------|-----------|
| Spectacular (very bright) | ≤ 0 |
| Naked eye visible | ≤ 2 |
| Visible with binoculars | ≤ 4 |
| Requires telescope | ≤ 6 |
| Faint | > 6 |

### Visibility rules

1. Hemisphere check: northern-only comets not visible from southern latitudes and vice versa.
2. Minimum latitude check (if defined).
3. Declination range check: average declination must yield max altitude ≥ 10°.

## Eclipse Visibility

- **Solar eclipses**: Bounding-box check against predefined visibility regions per eclipse.
- **Lunar eclipses**: Altitude sampling — check moon altitude at multiple points during eclipse duration; percentage of samples where moon is above horizon = visibility score.
- **São Miguel / Azores override**: Specific coordinate-based visibility overrides for known eclipses.

## Zodiac Signs

Determined by ecliptic longitude relative to J2000 epoch, mapped to 30° segments starting from Aries (0°).

## Solar Longitude

Calculated from Julian centuries since J2000.0 using:
- Mean longitude (L₀)
- Mean anomaly (M)
- Equation of center (C)

## Weather Data Source

- **API**: Open-Meteo hourly forecast (free, no API key).
- **Cache**: localStorage (web) / UserDefaults (iOS) with 3-hour TTL.
