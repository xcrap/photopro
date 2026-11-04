import { getSolarLongitude } from './solar-longitude'

/**
 * Moon ephemeris from Meeus, "Astronomical Algorithms", chapter 47.
 *
 * SunCalc's moon distance can never drop below 364,096 km and its phase is only
 * accurate to about ±3 hours, so supermoons and full/new moon instants use this
 * instead. See ALGORITHM.md → "Moon Ephemeris".
 */

/** Meeus Table 47.A: [D, M, M′, F, Σl (1e-6 deg), Σr (1e-3 km)] */
const TABLE_47A: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322],
  [2, -2, 0, 0, 2236, -9884],
  [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0],
  [2, -2, -1, 0, 2048, -4950],
  [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0],
  [4, -1, -1, 0, 1215, -3958],
  [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258],
  [2, 1, 1, 0, -810, 2616],
  [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117],
  [2, 2, -1, 0, -700, 2354],
  [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0],
  [4, 0, 1, 0, 549, -1423],
  [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571],
  [1, 0, -2, 0, -487, -1739],
  [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421],
  [1, 1, 1, 0, 351, 0],
  [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0],
  [2, -1, 2, 0, 327, 0],
  [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0],
  [2, 0, 3, 0, 294, 0],
  [2, 0, -1, -2, 0, 8752],
]

const RAD = Math.PI / 180
const DAY_MS = 86_400_000
/** Aberration correction applied to the Sun's true longitude (degrees). */
const SUN_ABERRATION_DEG = 0.00569

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360
}

function julianCenturies(date: Date): number {
  const jd = date.getTime() / DAY_MS + 2440587.5
  return (jd - 2451545) / 36525
}

interface MoonSeries {
  longitude: number
  distanceKm: number
}

function computeMoonSeries(date: Date): MoonSeries {
  const T = julianCenturies(date)
  const T2 = T * T
  const T3 = T2 * T
  const T4 = T3 * T

  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000
  const A1 = 119.75 + 131.849 * T
  const A2 = 53.09 + 479264.29 * T
  const E = 1 - 0.002516 * T - 0.0000074 * T2

  let sumL = 3958 * Math.sin(A1 * RAD) + 1962 * Math.sin((Lp - F) * RAD) + 318 * Math.sin(A2 * RAD)
  let sumR = 0

  for (const [d, m, mp, f, l, r] of TABLE_47A) {
    const eccentricity = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E * E : 1
    const argument = (d * D + m * M + mp * Mp + f * F) * RAD
    sumL += l * eccentricity * Math.sin(argument)
    sumR += r * eccentricity * Math.cos(argument)
  }

  return {
    longitude: normalizeDegrees(Lp + sumL / 1_000_000),
    distanceKm: 385000.56 + sumR / 1000,
  }
}

/** Geocentric ecliptic longitude of the Moon in degrees (0–360). */
export function getMoonEclipticLongitude(date: Date): number {
  return computeMoonSeries(date).longitude
}

/** Geocentric Earth–Moon distance in km. */
export function getMoonDistanceKm(date: Date): number {
  return computeMoonSeries(date).distanceKm
}

/** Moon − Sun ecliptic longitude in degrees (0 = new moon, 180 = full moon). */
export function getMoonElongation(date: Date): number {
  const sunLongitude = getSolarLongitude(date) - SUN_ABERRATION_DEG
  return normalizeDegrees(getMoonEclipticLongitude(date) - sunLongitude)
}

export type MoonPhaseTarget = 'new' | 'full'

function isBeforeTarget(elongation: number, target: MoonPhaseTarget): boolean {
  return target === 'full' ? elongation < 180 : elongation > 180
}

function hasCrossedTarget(previous: number, current: number, target: MoonPhaseTarget): boolean {
  if (target === 'full') return previous < 180 && current >= 180
  return previous > 300 && current < 60
}

/**
 * Find every new or full moon instant in [start, end).
 * Samples the elongation daily, then bisects the crossing day to < 1 second.
 */
export function findMoonPhaseInstants(start: Date, end: Date, target: MoonPhaseTarget): Date[] {
  const results: Date[] = []
  let t = start.getTime()
  let previous = getMoonElongation(new Date(t))

  while (t < end.getTime()) {
    const next = t + DAY_MS
    const current = getMoonElongation(new Date(next))

    if (hasCrossedTarget(previous, current, target)) {
      let lo = t
      let hi = next
      while (hi - lo > 1000) {
        const mid = (lo + hi) / 2
        if (isBeforeTarget(getMoonElongation(new Date(mid)), target)) {
          lo = mid
        } else {
          hi = mid
        }
      }
      const instant = Math.round((lo + hi) / 2)
      if (instant >= start.getTime() && instant < end.getTime()) {
        results.push(new Date(instant))
      }
    }

    previous = current
    t = next
  }

  return results
}
