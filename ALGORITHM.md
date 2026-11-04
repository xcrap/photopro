# PhotoPro — Shared Algorithm Specification

> **Canonical reference** for all prediction and scoring algorithms.
> Both `web/` (TypeScript) and `ios/` (Swift) must implement these rules identically.

## Time Zones & Day Boundaries

All "local" times and calendar days use the **location's** time zone, not the device's.

| Rule | Value |
|------|-------|
| Location time zone | First available, persisted with saved locations: (1) the zone found from the coordinates themselves — web: offline boundary lookup (`@photostructure/tz-lookup`); iOS: reverse geocoding or a searched place's time zone; (2) the IANA `timezone` returned by Open-Meteo (`timezone=auto`) |
| Fallback | Device time zone (only until one of the above is known) |
| Display | Every time and date shown in the UI is formatted in the location time zone |

Day-dependent calculations all use location-local days:

- Selected day / "Today" / "Tomorrow" (calendar-day difference, not 24 h periods)
- Sun times, moonrise/moonset, proximity scan
- Daily weather grouping and candidate hours
- Calendar month for folk names, blue moons and black moons

## Sun Times

- Call SunCalc `getTimes` with the instant of **12:00 local time** (location time zone) on the selected date. SunCalc returns the solar day nearest the given instant, so passing local midnight or an arbitrary time can return the previous or next day.

### Photographer hours (Sun altitude)

| Window | Morning | Evening |
|--------|---------|---------|
| **Blue hour** | −6° (civil dawn) → −4° | −4° → −6° (civil dusk) |
| **Golden hour** | −4° → +6° | +6° → −4° |

- The −4° crossings are an extra SunCalc time (`addTime(-4, …)`).
- Sunrise and sunset (−0.833°) fall inside the golden hours.
- Countdown events start at these boundaries:
  - Blue hour AM = −6° rising
  - Golden hour AM = −4° rising
  - Golden hour PM = +6° setting
  - Blue hour PM = −4° setting
- **Polar day/night:** when the Sun never reaches an event's altitude on that day, the event is **absent** (`null` / `nil`). Never substitute another time.
  - UI shows `—`, plus "Sun stays up all day" (sun altitude > 0 at solar noon and no sunset) or "Sun stays below the horizon" (no sunrise and altitude < 0 at solar noon).
  - Countdown and other features skip absent events.

## Terrain Horizon (Real First/Last Light)

Astronomical rise/set assumes a flat horizon. Hills, cliffs and calderas hide the Sun and Moon for longer, so the app also computes when they really clear the skyline. Trees and buildings are not in the data.

### Skyline

- **Elevation data:** Mapzen Terrarium tiles (`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`).
  - Decode with `elevation = R·256 + G + B/256 − 32768` metres, with no colour conversion.
  - Clamp negative values (sea) to 0.
- **Mosaics:** zoom 12 within 4.5 km, zoom 10 within 32 km, and zoom 8 within 170 km of the point. Sample them with bilinear interpolation.
  - For a sample point within 4 km of the observer use zoom 12; within 30 km, zoom 10; otherwise zoom 8.
  - Fall back to zoom 8, then to 0 m.
- **Observer eye:** ground elevation at the point + 1.7 m.
- **Rays:** 720 rays, one every 0.5° of azimuth from north.
  - Along each ray, sample from d = 25 m outward with step `max(15 m, 0.008·d)`, up to 160 km.
  - At each sample: `drop = d² / (2R) · (1 − 0.13)` with R = 6,371,008.8 m (Earth's curvature minus terrestrial refraction), and angle = `atan((h − drop − eye) / d)`.
  - Skyline angle for the ray = the maximum angle, in degrees. Keep its distance, and whether that point is sea (`h < 1`).
- **Skyline at any azimuth:** linear interpolation between the two neighbouring rays.
- Compute once per location (in a background worker/task) and reuse it for every date and time.

### First and last light

- **Apparent altitude:**
  - Sun: SunCalc's altitude plus astronomical refraction `R(h) = 0.0002967 / tan(h + 0.00312536 / (h + 0.08901179))` radians, with h clamped to ≥ 0.
  - Moon: SunCalc's moon altitude (which already includes refraction).
- **Visible** when the upper limb clears the skyline: `apparentAltitude + semiDiameter > skyline(azimuth)`. Semi-diameter is 0.27° for the Sun and 0.26° for the Moon.
- Scan the local day from local midnight every 2 minutes, then bisect each visibility change to within 5 s.
  - **First light** = the first hidden → visible change.
  - **Last light** = the last visible → hidden change.
  - The same scan for the Moon gives "Moon clears the terrain" and "Moon drops behind the terrain".
- If the body is never visible that day, both are absent.

## Moon Ephemeris

SunCalc's moon distance (`385001 − 20905·cos M`) can never go below 364,096 km and its phase is only accurate to about ±3 h, so these are computed with Meeus, *Astronomical Algorithms* ch. 47 (full periodic terms in the appendix):

- **Moon distance** = `385000.56 + Σr / 1000` km (geocentric). Used for supermoons and the displayed distance.
- **Moon ecliptic longitude** λ☾ = `L′ + Σl / 1,000,000` degrees, where Σl includes the additive terms `3958·sin A1 + 1962·sin(L′ − F) + 318·sin A2`.
- **Sun apparent longitude** λ☉ = Solar Longitude (below) − 0.00569°.
- **Elongation** = `(λ☾ − λ☉)` normalised to 0–360°. 0° = new moon, 180° = full moon.

Accuracy: about 1–2 min for new/full moon times, and a few km for distance. Check against Meeus example 47.a (1992-04-12 00:00 UTC):
- λ☾ = 133.162655°
- distance = 368,409.7 km

SunCalc is still used for rise/set times, altitude/azimuth, and illumination fraction.

## Full & New Moon Detection

1. Sample the elongation once per day across the range.
2. **Full moon:** elongation goes from `< 180°` to `≥ 180°` between two consecutive samples.
3. **New moon:** elongation wraps around, from `> 300°` to `< 60°`.
4. Bisect inside that one-day interval on the side of the target (before or after) until the interval is under 1 s. The result is the exact instant.
5. Folk name = the full moon's calendar month, in location-local time.

## Special Moon Events

| Event | Rule |
|-------|------|
| **Supermoon** | Full moon with Meeus distance < 362,000 km. Mark `isSupermoon` on the full moon itself, too. |
| **Blue moon** | Second full moon in the same calendar month (location time zone) |
| **Black moon** | Second new moon in the same calendar month (location time zone) |

Sanity check (2024–2026): supermoons on 2024-08-19, 2024-09-18, 2024-10-17, 2024-11-15, 2025-10-07, 2025-11-05, 2025-12-04, 2026-11-24 and 2026-12-24.

## Weather Scoring

### Sub-scores

| Sub-score | Formula | Notes |
|-----------|---------|-------|
| **Wind** | `100 - ((speed - ideal) / (max - ideal)) * 100`, clamped 0–100 | Ideal/max differ per profile |
| **High cloud** | `100 - abs(cloudCoverHigh - 55) * 2` | Best around ~55% high cloud for color |
| **Blocking cloud** | `100 - max(lowCloud, midCloud)` | Low/mid clouds block the sun |
| **Clear sky** | `100 - totalCloudCover` | |
| **Humidity** | `100 - ((humidity - 65) / (95 - 65)) * 100`, clamped 0–100 | Ideal ≤ 65%, max ≥ 95% |
| **Moon** | `100 - moonIlluminationPercent` | Illumination at the scored hour (SunCalc fraction × 100) |

The night profile **always** includes the moon sub-score. If a caller doesn't pass an illumination, compute it for the scored hour. Never default it to 100.

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

### Daily photo score

Each local date D in the forecast is scored from the **real sun times of D**, as computed by the Sun Times rules with the forecast's coordinates and the location time zone. Hours after midnight belong to the *previous* evening's night ("tonight").

| Profile | Candidate hours (forecast points `h`) | When absent |
|---------|----------------------------------------|-------------|
| **Sunset** | `sunset(D) − 90 min ≤ h ≤ sunset(D) + 60 min` | No sunset that day (polar) → no sunset candidates |
| **Night** | `dusk(D) ≤ h < dawn(D + 1)` (civil twilight, sun at −6°) | `dusk(D)` absent: if the Sun at solar noon is below −6° (deep polar night), start at 18:00 D local; otherwise (white night) there are no night candidates. `dawn(D + 1)` absent: end at 06:00 D+1 local |

- Skip candidate hours that are already in the past (before the start of the current hour).
- Also evaluate the date *before* the first forecast date. That way the rest of tonight is scored when the forecast starts after midnight.
- Daily score = the highest-scoring candidate. Keep its hour as the observation time and its profile.
- A date with no remaining candidates is omitted.
- Show at most 7 days, in date order.

### Trend indicator

- Compare the day's score with the score for the **same profile at the same time 24 h later** (observation time + 24 h). Don't compare against the next day's best hour.
- Delta ≥ +10 → `↗ improving`. Delta ≤ −10 → `↘ getting worse`. Otherwise `→ steady`.

### Opportunity ranking (combined score)

- Astronomy score = `0.6 × azimuthAlignment + 0.4 × timingAlignment`
  - azimuthAlignment = `100 − (azimuthDiff / 30) × 100`, clamped
  - timingAlignment = `100 − (timeDiffMinutes / 30) × 100`, clamped
- Combined score = `0.5 × astronomy + 0.5 × weather` (astronomy only if no forecast covers the event)
- Weather for an opportunity = sunset profile at the Sun event time.

## Proximity Finder (Moon/Sun Photo Opportunities)

Detects moon and sun rise/set events that happen close together in time, with the moon in a photogenic position.

### Thresholds

| Parameter | Value |
|-----------|-------|
| Max time difference | 30 minutes |
| Max azimuth deviation | 30 degrees |
| Min moon illumination | 5% |

### Logic

1. For each local day in the scan range, compute all 4 event pairs:
   - (moonrise, sunrise)
   - (moonrise, sunset)
   - (moonset, sunrise)
   - (moonset, sunset)
2. Keep pairs whose time difference is ≤ 30 min.
3. At the midpoint of the two events, compute the azimuth deviation using circular math, `circ(a, b) = min(|a − b|, 360 − |a − b|)`:
   - **Same-event pairs** (moonrise+sunrise, moonset+sunset), where the moon is beside the Sun: deviation = `circ(moonAz, sunAz)`.
   - **Cross pairs** (moonrise+sunset, moonset+sunrise), where the moon is opposite the Sun (the full-moon shot): deviation = `circ(moonAz, sunAz + 180)`.
4. Keep pairs with deviation ≤ 30° **and** moon illumination ≥ 5% at the midpoint. A moon fainter than that is invisible next to the Sun.
5. `azimuthDiff` = that deviation. Quality and astronomy score use it as-is.

## Countdown (Next Photography Event)

### Considered events

**Sun:** Blue hour AM, Sunrise, Golden hour AM, Golden hour PM, Sunset, Blue hour PM (absent events skipped).
**Moon:** Moonrise, Moonset.
**Meteors:** Peak intensity showers (ZHR ≥ 50) within 30 days.

### Logic

1. Collect all candidate event times for today and tomorrow (location-local days).
2. Filter for future events only (`time > now`).
3. Sort chronologically.
4. Return the nearest event with `secondsUntil`.
5. Updates every 30 seconds.

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

### Dates

- Peak and activity dates come from the solar longitudes in `meteor-showers.json`.
- Compute each shower for years **Y − 1, Y and Y + 1**, where Y is the reference date's year. Showers that cross New Year (Quadrantids) are then found in early January.
- `isActive` is relative to the reference date, not the wall clock.

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

- **Solar eclipses:** bounding-box check against the predefined visibility regions for each eclipse. The best matching region's percentage wins.
- **Lunar eclipses:** sample the moon's altitude every 5 minutes across the eclipse duration, centred on the peak. Visibility score = percentage of samples with the moon above the horizon. Region boxes aren't used for lunar eclipses.
- **São Miguel / Azores override:** if the location is inside the override bounds and the eclipse has an entry, the override replaces the computed value. Keys are the eclipse instant in ISO 8601 with milliseconds (`2026-08-12T17:46:00.000Z`).
- The peak time is the eclipse `date` instant, displayed in the location time zone.

## Zodiac Signs

Determined by ecliptic longitude relative to J2000 epoch, mapped to 30° segments starting from Aries (0°).

## Solar Longitude

Calculated from Julian centuries since J2000.0 using:
- Mean longitude (L₀)
- Mean anomaly (M)
- Equation of center (C)

## Weather Data Source

- **API:** Open-Meteo hourly forecast (free, no API key).
  - Request `timezone=auto` and `timeformat=unixtime`. Hourly `time` values are then absolute instants, and `timezone` gives the location's IANA zone.
  - Never parse offset-less local timestamps as device time.
  - Prefer `forecast_days=7`, which starts at the location's local today. If you send explicit `start_date` / `end_date` instead, they must be location-local dates formatted with a fixed Gregorian / POSIX locale.
- **Cache:** localStorage (web) / UserDefaults (iOS), 3-hour TTL.
  - Key = the **requested** coordinates rounded to 3 decimals. Open-Meteo snaps responses to its grid, so the coordinates it returns never match.
  - Keep at most the 10 most recent locations.
- **Refetch** whenever the current location changes. Ignore responses for a location that is no longer current.

## Appendix — Meeus Table 47.A (Moon longitude and distance)

Argument = `D·D + M·M + M′·M′ + F·F`, with these fundamental arguments (degrees, T = Julian centuries since J2000.0):

```
L′ = 218.3164477 + 481267.88123421 T − 0.0015786 T² + T³/538841 − T⁴/65194000
D  = 297.8501921 + 445267.1114034 T − 0.0018819 T² + T³/545868 − T⁴/113065000
M  = 357.5291092 + 35999.0502909 T − 0.0001536 T² + T³/24490000
M′ = 134.9633964 + 477198.8675055 T + 0.0087414 T² + T³/69699 − T⁴/14712000
F  = 93.2720950 + 483202.0175233 T − 0.0036539 T² − T³/3526000 + T⁴/863310000
A1 = 119.75 + 131.849 T
A2 = 53.09 + 479264.290 T
E  = 1 − 0.002516 T − 0.0000074 T²
```

- Σl = Σ coefficient × sin(argument).
- Σr = Σ coefficient × cos(argument).
- Multiply a term by `E` when |M| = 1, and by `E²` when |M| = 2.
- Σl is in 10⁻⁶ degrees; Σr is in 10⁻³ km.

| D | M | M′ | F | Σl | Σr |
|---|---|----|---|----|----|
| 0 | 0 | 1 | 0 | 6288774 | -20905355 |
| 2 | 0 | -1 | 0 | 1274027 | -3699111 |
| 2 | 0 | 0 | 0 | 658314 | -2955968 |
| 0 | 0 | 2 | 0 | 213618 | -569925 |
| 0 | 1 | 0 | 0 | -185116 | 48888 |
| 0 | 0 | 0 | 2 | -114332 | -3149 |
| 2 | 0 | -2 | 0 | 58793 | 246158 |
| 2 | -1 | -1 | 0 | 57066 | -152138 |
| 2 | 0 | 1 | 0 | 53322 | -170733 |
| 2 | -1 | 0 | 0 | 45758 | -204586 |
| 0 | 1 | -1 | 0 | -40923 | -129620 |
| 1 | 0 | 0 | 0 | -34720 | 108743 |
| 0 | 1 | 1 | 0 | -30383 | 104755 |
| 2 | 0 | 0 | -2 | 15327 | 10321 |
| 0 | 0 | 1 | 2 | -12528 | 0 |
| 0 | 0 | 1 | -2 | 10980 | 79661 |
| 4 | 0 | -1 | 0 | 10675 | -34782 |
| 0 | 0 | 3 | 0 | 10034 | -23210 |
| 4 | 0 | -2 | 0 | 8548 | -21636 |
| 2 | 1 | -1 | 0 | -7888 | 24208 |
| 2 | 1 | 0 | 0 | -6766 | 30824 |
| 1 | 0 | -1 | 0 | -5163 | -8379 |
| 1 | 1 | 0 | 0 | 4987 | -16675 |
| 2 | -1 | 1 | 0 | 4036 | -12831 |
| 2 | 0 | 2 | 0 | 3994 | -10445 |
| 4 | 0 | 0 | 0 | 3861 | -11650 |
| 2 | 0 | -3 | 0 | 3665 | 14403 |
| 0 | 1 | -2 | 0 | -2689 | -7003 |
| 2 | 0 | -1 | 2 | -2602 | 0 |
| 2 | -1 | -2 | 0 | 2390 | 10056 |
| 1 | 0 | 1 | 0 | -2348 | 6322 |
| 2 | -2 | 0 | 0 | 2236 | -9884 |
| 0 | 1 | 2 | 0 | -2120 | 5751 |
| 0 | 2 | 0 | 0 | -2069 | 0 |
| 2 | -2 | -1 | 0 | 2048 | -4950 |
| 2 | 0 | 1 | -2 | -1773 | 4130 |
| 2 | 0 | 0 | 2 | -1595 | 0 |
| 4 | -1 | -1 | 0 | 1215 | -3958 |
| 0 | 0 | 2 | 2 | -1110 | 0 |
| 3 | 0 | -1 | 0 | -892 | 3258 |
| 2 | 1 | 1 | 0 | -810 | 2616 |
| 4 | -1 | -2 | 0 | 759 | -1897 |
| 0 | 2 | -1 | 0 | -713 | -2117 |
| 2 | 2 | -1 | 0 | -700 | 2354 |
| 2 | 1 | -2 | 0 | 691 | 0 |
| 2 | -1 | 0 | -2 | 596 | 0 |
| 4 | 0 | 1 | 0 | 549 | -1423 |
| 0 | 0 | 4 | 0 | 537 | -1117 |
| 4 | -1 | 0 | 0 | 520 | -1571 |
| 1 | 0 | -2 | 0 | -487 | -1739 |
| 2 | 1 | 0 | -2 | -399 | 0 |
| 0 | 0 | 2 | -2 | -381 | -4421 |
| 1 | 1 | 1 | 0 | 351 | 0 |
| 3 | 0 | -2 | 0 | -340 | 0 |
| 4 | 0 | -3 | 0 | 330 | 0 |
| 2 | -1 | 2 | 0 | 327 | 0 |
| 0 | 2 | 1 | 0 | -323 | 1165 |
| 1 | 1 | -1 | 0 | 299 | 0 |
| 2 | 0 | 3 | 0 | 294 | 0 |
| 2 | 0 | -1 | -2 | 0 | 8752 |
