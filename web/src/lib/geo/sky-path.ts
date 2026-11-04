import SunCalc from 'suncalc'

const RAD = Math.PI / 180

export type SkyBody = 'sun' | 'moon'

/**
 * Altitude (degrees) at which SunCalc's rise/set happen, so the path meets the horizon exactly
 * at the sunrise/sunset (moonrise/moonset) directions: the Sun's geometric altitude −0.833°,
 * the Moon's (refracted) altitude +0.133°.
 */
const HORIZON: Record<SkyBody, number> = { sun: -0.833, moon: 0.133 }

export interface SkyPoint {
  /** Degrees from north, clockwise. */
  azimuth: number
  /** Degrees above the horizon (0 at rise/set). */
  altitude: number
}

function position(body: SkyBody, at: number, lat: number, lng: number) {
  const pos = body === 'sun' ? SunCalc.getPosition(new Date(at), lat, lng) : SunCalc.getMoonPosition(new Date(at), lat, lng)
  return { azimuth: (pos.azimuth / RAD + 180) % 360, altitude: pos.altitude / RAD }
}

/**
 * The body's path across the sky between `start` and `end`, as runs of points while it is up.
 * Each run starts/ends exactly on the horizon (interpolated rise/set) unless it is cut by
 * `start`/`end` while the body is still up.
 */
export function skyPath(body: SkyBody, start: Date, end: Date, lat: number, lng: number, stepMinutes = 5): SkyPoint[][] {
  const h0 = HORIZON[body]
  const step = stepMinutes * 60_000
  const runs: SkyPoint[][] = []
  let run: SkyPoint[] | null = null
  let previous: { t: number; altitude: number } | null = null

  for (let t = start.getTime(); t <= end.getTime(); t += step) {
    const pos = position(body, t, lat, lng)
    const up = pos.altitude > h0
    if (previous && up !== previous.altitude > h0) {
      const f = (h0 - previous.altitude) / (pos.altitude - previous.altitude)
      const onHorizon = { azimuth: position(body, previous.t + f * (t - previous.t), lat, lng).azimuth, altitude: 0 }
      if (up) {
        run = [onHorizon]
        runs.push(run)
      } else {
        run?.push(onHorizon)
        run = null
      }
    } else if (!previous && up) {
      run = []
      runs.push(run)
    }
    if (up && run) run.push({ azimuth: pos.azimuth, altitude: Math.max(0, pos.altitude - h0) })
    previous = { t, altitude: pos.altitude }
  }
  return runs.filter((points) => points.length > 1)
}

/** Where the body is at `at`, on the same scale as `skyPath` (altitude 0 = on the horizon). */
export function skyPosition(body: SkyBody, at: Date, lat: number, lng: number): SkyPoint & { up: boolean } {
  const pos = position(body, at.getTime(), lat, lng)
  const altitude = pos.altitude - HORIZON[body]
  return { azimuth: pos.azimuth, altitude, up: altitude > 0 }
}

/** Ground distance from the spot for a sky point: the sky dome seen from above (radius × cos altitude). */
export function skyDistance(altitude: number, radius: number): number {
  return radius * Math.cos(Math.max(0, altitude) * RAD)
}
